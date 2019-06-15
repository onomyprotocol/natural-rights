import { Database } from './Database'
import * as actions from './actions'

function getActionType(type: string) {
  switch (type) {
    case 'InitializeUser':
      return actions.InitializeUser
    case 'AddDevice':
      return actions.AddDevice
    case 'RemoveDevice':
      return actions.RemoveDevice
    case 'CreateGroup':
      return actions.CreateGroup
    case 'RemoveMemberFromGroup':
      return actions.RemoveMemberFromGroup
    case 'AddAdminToGroup':
      return actions.AddAdminToGroup
    case 'RemoveAdminFromGroup':
      return actions.RemoveAdminFromGroup
    case 'EncryptDocument':
      return actions.EncryptDocument
    case 'GrantAccess':
      return actions.GrantAccess
    case 'DecryptDocument':
      return actions.DecryptDocument
    case 'RevokeAccess':
      return actions.RevokeAccess
    case 'UpdateDocument':
      return actions.UpdateDocument
    default:
      return null
  }
}

export class LocalService implements ServiceInterface {
  db: Database
  primitives: PrimitivesInterface

  constructor(primitives: PrimitivesInterface, adapter: DatabaseAdapterInterface) {
    this.primitives = primitives
    this.db = new Database(adapter)
  }

  async authenticate(req: NaturalRightsRequest) {
    const device = await this.db.getDevice(req.userId, req.deviceId)
    if (!device || !device.signPubKey) return false
    return this.primitives.verify(device.signPubKey, req.signature, req.body)
  }

  async request(req: NaturalRightsRequest) {
    const results: Result[] = []
    const actions: NaturalRightsAction[] = JSON.parse(req.body)

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
    const ActionType = getActionType(action.type)
    if (!ActionType) {
      return {
        type: action.type,
        payload: action.payload,
        success: false,
        error: 'Invalid action type'
      } as Result
    }
    const handler = new ActionType(req.userId, req.deviceId, action.payload)
    if (!(await handler.checkIsAuthorized(this.db))) {
      return {
        type: action.type,
        payload: action.payload,
        success: false,
        error: 'Unauthorized'
      } as Result
    }
    return {
      ...action,
      payload: await handler.execute(this.db)
    } as Result
  }
}
