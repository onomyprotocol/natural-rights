import { Database } from './Database'
import * as actions from './actions'
import { ActionHandler } from './actions/ActionHandler'

function isValidActionType(type: string): type is keyof typeof actions {
  return type in actions
}

export class LocalService implements ServiceInterface {
  db: Database
  primitives: PrimitivesInterface
  sea: SEAPrimitivesInterface
  signKeyPair?: KeyPair // TODO initialize/track

  constructor(
    primitives: PrimitivesInterface,
    sea: SEAPrimitivesInterface,
    adapter: DatabaseAdapterInterface
  ) {
    this.primitives = primitives
    this.db = new Database(adapter)
    this.sea = sea
  }

  getActionHandler(req: NaturalRightsRequest, action: Action<any>) {
    if (!isValidActionType(action.type)) return null
    const ActionType: any = actions[action.type]
    return new ActionType(req.userId, req.deviceId, action.payload) as ActionHandler
  }

  parseRequestBody(req: NaturalRightsRequest) {
    return JSON.parse(req.body) as NaturalRightsAction[]
  }

  async authenticateLogin(req: NaturalRightsRequest) {
    const actions = this.parseRequestBody(req)
    const loginActions = actions.filter(action => action.type === 'Login')
    if (actions.length !== loginActions.length || loginActions.length !== 1) return false
    if (await this.primitives.verify(req.deviceId, req.signature, req.body)) {
      return ''
    }
    return false
  }

  async authenticate(req: NaturalRightsRequest) {
    const device = await this.db.getDevice(req.deviceId)
    if (!device || !device.signPubKey) return this.authenticateLogin(req)
    const actions = this.parseRequestBody(req)
    const initializeUserActions = actions.filter(action => action.type === 'InitializeUser')
    if (initializeUserActions.length > 1) return false

    if (await this.primitives.verify(device.signPubKey, req.signature, req.body)) {
      if (device.userId) {
        return device.userId
      }

      if (initializeUserActions.length === 1) {
        const initUserAction = initializeUserActions[0]
        if (initUserAction !== actions[0]) return false
        const initUser = initializeUserActions[0].payload as InitializeUserAction
        const existing = await this.db.getUser(initUser.userId)
        if (!existing) return initUser.userId
      }

      return ''
    }
    return false
  }

  async request(req: NaturalRightsRequest) {
    const results: Result[] = []
    const actions = this.parseRequestBody(req)
    const userId = await this.authenticate(req)

    if (userId === false) {
      // signature failed validation
      return {
        results: actions.map(result => ({
          ...result,
          success: false,
          error: 'Authentication error'
        }))
      } as NaturalRightsResponse
    }

    req.userId = userId

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
    try {
      return {
        ...action,
        payload: await handler.execute(this),
        success: true,
        error: ''
      } as Result
    } catch (error) {
      return {
        ...action,
        success: false,
        error
      } as Result
    }
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
    if (document.cryptUserId === userId) return { document }

    for (let grant of grants) {
      if (grant.kind === 'user') {
        if (grant.id === userId) return { document, grant }
        continue
      }

      const membership = await this.db.getMembership(grant.id, userId)

      if (membership) return { document, grant, membership }
    }
  }

  async getUserDocumentDecryptKey(userId: string, documentId: string) {
    const credentials = await this.getCredentials(userId, documentId)
    if (!credentials) return ''
    if (!credentials.grant) return credentials.document.encCryptPrivKey
    if (!credentials.membership) return credentials.grant.encCryptPrivKey
    return this.primitives.cryptTransform(
      credentials.membership.cryptTransformKey,
      credentials.grant.encCryptPrivKey,
      this.signKeyPair!
    )
  }

  async getDeviceDocumentDecryptKey(userId: string, deviceId: string, documentId: string) {
    const [userKey, device] = await Promise.all([
      this.getUserDocumentDecryptKey(userId, documentId),
      this.db.getDevice(deviceId)
    ])
    if (!userKey || !device || !device.cryptTransformKey) return ''
    return this.primitives.cryptTransform(device.cryptTransformKey, userKey, this.signKeyPair!)
  }

  async getHasReadAccess(userId: string, documentId: string) {
    return !!(await this.getUserDocumentDecryptKey(userId, documentId))
  }

  async getHasSignAccess(userId: string, documentId: string) {
    const credentials = await this.getCredentials(userId, documentId)
    if (!credentials) return false
    const { document, membership, grant } = credentials
    if (document.creatorId === userId) return true
    if (!grant || !grant.canSign) return false
    if (membership) return membership.canSign
    return grant.canSign
  }
}
