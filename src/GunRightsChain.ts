import { Client } from './Client'
import { GUN } from './GUN'
import { RemoteHttpService } from './RemoteHttpService'
import { SEA } from './SEA'

type GunChain = any

export class GunRightsChain {
  service: ServiceInterface
  client?: Client
  documentId: string
  root: GunChain
  parent: GunChain

  constructor(service: ServiceInterface, root: GunChain, parent: GunChain) {
    this.service = service
    this.root = root
    this.parent = parent
    this.documentId = GUN.getDocumentId(parent._.soul || '')
  }

  userId() {
    const rights = this.root.rights()
    if (rights !== this) {
      return rights.userId()
    }
    return this.client ? this.client.userId : ''
  }

  getClient() {
    const rights = this.root.rights()
    if (!rights.client) {
      debugger
      throw new Error('Not logged in')
    }
    return rights.client
  }

  async signup() {
    const rights = this.root.rights()
    if (rights !== this) {
      await rights.signup()
      return this
    }

    if (this.client) throw new Error('Already logged in')

    const deviceCryptKeyPair = await this.service.primitives.cryptKeyGen()
    const deviceSignKeyPair = await this.service.primitives.signKeyGen()

    const newClient = new Client(this.service, '', deviceCryptKeyPair, deviceSignKeyPair)

    await newClient.initializeUser()
    this.client = newClient
    return this
  }

  async login(deviceCryptKeyPair: KeyPair, deviceSignKeyPair: KeyPair, userId: string) {
    const rights = this.root.rights()
    if (rights !== this) {
      await rights.login(deviceCryptKeyPair, deviceSignKeyPair, userId)
      return this
    }

    const newClient = new Client(this.service, userId, deviceCryptKeyPair, deviceSignKeyPair)
    // await newClient.login()
    this.client = newClient
    return this
  }

  async logout() {
    const rights = this.root.rights()
    if (rights !== this) {
      await rights.logout()
      return this
    }
    this.client = undefined
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
      await this.client!.addAdminToGroup(groupId, userId)
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
    const soul = GUN.documentIdToSoul(documentId)
    const chain = this.root.get(soul)
    return chain
  }

  // Could be useful for tighter gun integration
  // If async uuids work in gun
  uuid(cb?: (err: any, soul: string) => void) {
    console.log('called uuid', cb)
    if (!cb) return
    return (async () => {
      try {
        const { id } = await this.getClient().createDocument()
        const soul = GUN.documentIdToSoul(id)
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

  const service = new RemoteHttpService(Primitives, SEA, url)

  Gun.on(`opt`, function(this: any, at: any) {
    if (!at.naturalRights) {
      GUN.afore(at.on('out'), GUN.gunWireOutput)
      // at.on('out', GUN.gunWireOutput, at)
      at.on('node', GUN.gunApiOutput, at)
      // GUN.afore(at.on('node'), GUN.gunApiOutput)
    }

    this.to.next(at)
  })

  Gun.chain.rights = function(this: any) {
    let root = this.back(-1)
    let nr: GunRightsChain = root._.naturalRights

    if (nr && root === this) {
      return nr
    }

    nr = new GunRightsChain(service, root, this)

    if (this === root) {
      root._.naturalRights = nr
    }

    return nr
  }
}
