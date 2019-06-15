import { Database } from './Database'
import * as actions from './actions'
import { ActionHandler } from './actions/ActionHandler'

function isValidActionType(type: string): type is keyof typeof actions {
  return type in actions
}

export class LocalService implements ServiceInterface {
  db: Database
  primitives: PrimitivesInterface

  constructor(primitives: PrimitivesInterface, adapter: DatabaseAdapterInterface) {
    this.primitives = primitives
    this.db = new Database(adapter)
  }

  getActionHandler(req: NaturalRightsRequest, action: Action<any>) {
    if (!isValidActionType(action.type)) return null
    const ActionType: any = actions[action.type]
    return new ActionType(req.userId, req.deviceId, action.payload) as ActionHandler
  }

  parseRequestBody(req: NaturalRightsRequest) {
    return JSON.parse(req.body) as NaturalRightsAction[]
  }

  async authenticateInitializeUser(req: NaturalRightsRequest) {
    const actions = this.parseRequestBody(req)
    const initializeUserActions = actions.filter(action => action.type === 'InitializeUser')
    const addDeviceActions = actions.filter(({ type }) => type === 'AddDevice')
    if (initializeUserActions.length !== 1 || addDeviceActions.length !== 1) return false
    const initializeUser = initializeUserActions[0].payload as InitializeUserAction
    const addDevice = addDeviceActions[0].payload as AddDeviceAction

    const user = await this.db.getUser(initializeUser.userId)
    if (user) return false

    return this.primitives.verify(addDevice.signPubKey, req.signature, req.body)
  }

  async authenticate(req: NaturalRightsRequest) {
    const device = await this.db.getDevice(req.userId, req.deviceId)
    if (!device || !device.signPubKey) return this.authenticateInitializeUser(req)
    return this.primitives.verify(device.signPubKey, req.signature, req.body)
  }

  async request(req: NaturalRightsRequest) {
    const results: Result[] = []
    const actions = this.parseRequestBody(req)

    if (!(await this.authenticate(req))) {
      return {
        results: actions.map(result => ({
          ...result,
          success: false,
          error: 'Authentication error'
        }))
      } as NaturalRightsResponse
    }

    for (let action of actions) {
      results.push(await this.processAction(req, action))
    }

    return { results } as NaturalRightsResponse
  }

  async processAction(req: NaturalRightsRequest, action: Action<any>) {
    const handler = this.getActionHandler(req, action)
    if (!handler) {
      return {
        type: action.type,
        payload: action.payload,
        success: false,
        error: 'Invalid action type'
      } as Result
    }
    if (!(await handler.checkIsAuthorized(this))) {
      return {
        type: action.type,
        payload: action.payload,
        success: false,
        error: 'Unauthorized'
      } as Result
    }
    return {
      ...action,
      payload: await handler.execute(this),
      success: true,
      error: ''
    } as Result
  }

  async getIsGroupAdmin(groupId: string, userId: string) {
    const [group, membership] = await Promise.all([
      this.db.getGroup(groupId),
      this.db.getMembership(groupId, userId)
    ])
    if (group && group.userId === userId) return true
    return !!(group && membership && membership.encGroupCryptPrivKey)
  }

  async getCredentials(userId: string, documentId: string) {
    const [document, grants] = await Promise.all([
      this.db.getDocument(documentId),
      this.db.getDocumentGrants(documentId)
    ])

    if (!document) return
    if (document.userId === userId) return { document }

    for (let grant of grants) {
      if (grant.kind === 'user') {
        if (grant.id === userId) return { document, grant }
        continue
      }

      const membership = await this.db.getMembership(grant.id, userId)
      if (membership) return { document, grant, membership }
    }
  }

  async getUserEncryptedDocumentKey(userId: string, documentId: string) {
    const credentials = await this.getCredentials(userId, documentId)
    if (!credentials) return ''
    if (!credentials.grant) return credentials.document.encCryptPrivKey
    if (!credentials.membership) return credentials.grant.encCryptPrivKey
    return this.primitives.cryptTransform(
      credentials.membership.cryptTransformKey,
      credentials.grant.encCryptPrivKey
    )
  }

  async getDeviceEncryptedDocumentKey(userId: string, deviceId: string, documentId: string) {
    const [userKey, device] = await Promise.all([
      this.getUserEncryptedDocumentKey(userId, documentId),
      this.db.getDevice(userId, deviceId)
    ])
    if (!userKey || !device || !device.cryptTransformKey) return ''
    return this.primitives.cryptTransform(device.cryptTransformKey, userKey)
  }

  async getHasAccess(userId: string, documentId: string) {
    return !!(await this.getCredentials(userId, documentId))
  }
}
