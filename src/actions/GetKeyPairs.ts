import { ActionHandler } from './ActionHandler'
import { LocalService } from '../LocalService'

export class GetKeyPairs extends ActionHandler {
  payload: GetKeyPairsAction

  constructor(userId: string, deviceId: string, payload: GetKeyPairsAction) {
    super(userId, deviceId)
    this.payload = payload
  }

  async checkIsAuthorized(service: LocalService) {
    if (!this.userId) return false
    if (this.payload.kind === 'group') return service.getIsGroupAdmin(this.payload.id, this.userId)
    if (this.payload.kind === 'user') return this.payload.id === this.userId
    return false
  }

  async execute(service: LocalService) {
    const device = await service.db.getDevice(this.deviceId)
    if (!device) throw new Error('Device does not exist')

    if (this.payload.kind === 'user') {
      const user = await service.db.getUser(this.payload.id)
      if (!user) throw new Error('User does not exist')

      return {
        ...this.payload,
        cryptPubKey: user.cryptPubKey,
        signPubKey: user.signPubKey,
        encCryptPrivKey: await service.primitives.cryptTransform(
          device.cryptTransformKey,
          user.encCryptPrivKey,
          service.signKeyPair!
        ),
        encSignPrivKey: await service.primitives.cryptTransform(
          device.cryptTransformKey,
          user.encSignPrivKey,
          service.signKeyPair!
        )
      } as GetKeyPairsResult
    } else if (this.payload.kind === 'group') {
      const group = await service.db.getGroup(this.payload.id)
      if (!group) throw new Error('Group does not exist')
      let encCryptPrivKey = ''
      if (group.userId === this.userId) {
        encCryptPrivKey = group.encCryptPrivKey
      } else {
        const membership = await service.db.getMembership(this.payload.id, this.userId)
        if (!membership) throw new Error('Membership does not exist')
        encCryptPrivKey = membership.encGroupCryptPrivKey
      }

      return {
        ...this.payload,
        cryptPubKey: group.cryptPubKey,
        encCryptPrivKey: await service.primitives.cryptTransform(
          device.cryptTransformKey,
          encCryptPrivKey,
          service.signKeyPair!
        ),
        signPubKey: '',
        encSignPrivKey: ''
      } as GetKeyPairsResult
    }

    throw new Error('Unexpected GetKeyPairs kind')
  }
}
