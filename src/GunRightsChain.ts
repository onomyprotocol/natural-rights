import { Client } from './Client'
import { initGUN } from './GUN'
import { RemoteHttpService } from './RemoteHttpService'

type GunChain = any

export class GunRightsChain {
  GUN: any
  service: ServiceInterface
  client?: Client
  documentId: string
  _root: GunChain
  parent: GunChain

  constructor(GUN: any, service: ServiceInterface, root: GunChain, parent: GunChain) {
    this.GUN = GUN
    this.service = service
    this._root = root
    this.parent = parent
    this.documentId = GUN.getDocumentId(parent._.soul || '')
  }

  userId() {
    const rights = this._root.rights()
    if (rights !== this) return rights.userId()
    return this.client ? this.client.userId : ''
  }

  getClient() {
    const rights = this._root.rights()
    if (!rights.client) {
      debugger
      throw new Error('Not logged in')
    }
    return rights.client
  }

  root() {
    const client = this.getClient()
    if (!client) return

    return this.get(client.rootDocumentId)
  }

  async signup() {
    const rights = this._root.rights()
    if (rights !== this) {
      await rights.signup()
      return this
    }

    if (!this.client) throw new Error('Must login first')

    await this.client.registerUser()
    return this
  }

  async login(deviceCryptKeyPair: KeyPair, deviceSignKeyPair: KeyPair, userId: string) {
    const rights = this._root.rights()
    if (rights !== this) {
      await rights.login(deviceCryptKeyPair, deviceSignKeyPair, userId)
      return this
    }

    const newClient = new Client(this.service, deviceCryptKeyPair, deviceSignKeyPair)
    await newClient.login()
    this.client = newClient
    return this
  }

  async logout() {
    const rights = this._root.rights()
    if (rights !== this) {
      await rights.logout()
      return this
    }
    if (!this.client) return
    await this.client.deauthorizeDevice()
    await this.client.login()
    return this
  }

  async authorizeDevice(deviceId: string) {
    await this.getClient().authorizeDevice(deviceId)
    return this
  }

  async deauthorizeDevice(deviceId: string) {
    const client = this.getClient()
    if (client && client.deviceId === deviceId) return this.logout()
    await client.deauthorizeDevice(deviceId)
    return this
  }

  async createGroup() {
    const groupId = await this.getClient().createGroup()
    return groupId
  }

  async addGroupMember(
    groupId: string,
    userId: string,
    { read, sign, admin } = { read: true, sign: true, admin: false }
  ) {
    if (admin) {
      await this.getClient().addAdminToGroup(groupId, userId)
      return this
    }

    if (read || sign) {
      await this.getClient().addReaderToGroup(groupId, userId)
    }

    if (sign) {
      await this.getClient().addSignerToGroup(groupId, userId)
    }

    return this
  }

  async removeGroupMember(groupId: string, userId: string) {
    await this.getClient().removeMemberFromGroup(groupId, userId)
  }

  async removeGroupAdmin(groupId: string, userId: string) {
    await this.getClient().removeAdminFromGroup(groupId, userId)
  }

  async grant(kind: GrantKind, id: string, { read, sign } = { read: true, sign: false }) {
    if (!this.documentId) throw new Error('Not on document chain')
    if (read || sign) await this.getClient().grantReadAccess(this.documentId, kind, id)
    if (sign) await this.getClient().grantSignAccess(this.documentId, kind, id)
    return this
  }

  async revoke(kind: GrantKind, id: string) {
    await this.getClient().revokeAccess(this.documentId, kind, id)
    return this
  }

  async create() {
    const { id } = await this.getClient().createDocument()
    return id
  }

  get(documentId: string) {
    const soul = this.GUN.documentIdToSoul(documentId)
    const chain = this._root.get(soul)
    chain._.opt = { uuid: this.uuid.bind(this) }
    return chain
  }

  uuid(cb?: (err: any, soul: string) => void) {
    if (!cb) return
    return (async () => {
      try {
        const { id } = await this.getClient().createDocument()
        const soul = this.GUN.documentIdToSoul(id)
        cb(null, soul)
        return soul
      } catch (err) {
        console.warn(err.stack || err)
        cb(err, '')
      }
    })()
  }
}

export function attachToGun(Gun: any, Primitives: PrimitivesInterface, url: string) {
  if (Gun.chain.rights) return

  const GUN = initGUN(Gun)
  const SEA = GUN.SEA
  const service = new RemoteHttpService(Primitives, SEA, url)

  Gun.on(`opt`, function(this: any, at: any) {
    if (!at.naturalRights) {
      GUN.afore(at.on('out'), GUN.gunWireOutput)
      at.on('node', GUN.gunApiOutput, at)
    }

    this.to.next(at)
  })

  Gun.chain.rights = function(this: any) {
    let root = this.back(-1)
    let nr: GunRightsChain = root._.naturalRights

    if (nr && root === this) return nr
    nr = new GunRightsChain(GUN, service, root, this)
    if (this === root) root._.naturalRights = nr
    return nr
  }
}
