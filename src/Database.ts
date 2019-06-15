const PREFIX = ``

export class Database implements DatabaseInterface {
  adapter: DatabaseAdapterInterface

  constructor(adapter: DatabaseAdapterInterface) {
    this.adapter = adapter
  }

  async getUser(userId: string) {
    const soul = `${PREFIX}/users/${userId}`
    const user = await this.adapter.get(soul)
    if (!user) return null
    return user as UserRecord
  }

  async putUser(user: UserRecord) {
    const soul = `${PREFIX}/users/${user.id}`
    await this.adapter.put(soul, user)
  }

  async deleteUser(userId: string) {
    const soul = `${PREFIX}/users/${userId}`
    await this.adapter.delete(soul)
    // TODO: Delete all associated devices
    // TODO: Delete all documents?
  }

  async getDevice(userId: string, deviceId: string) {
    const soul = `${PREFIX}/users/${userId}/devices/${deviceId}`
    const device = await this.adapter.get(soul)
    if (!device) return null
    return device as DeviceRecord
  }

  async putDevice(device: DeviceRecord) {
    const soul = `${PREFIX}/users/${device.userId}/devices/${device.id}`
    await this.adapter.put(soul, device)
  }

  async deleteDevice(userId: string, deviceId: string) {
    const soul = `${PREFIX}/users/${userId}/devices/${deviceId}`
    await this.adapter.delete(soul)
  }

  async getGroup(groupId: string) {
    const soul = `${PREFIX}/groups/${groupId}`
    const group = await this.adapter.get(soul)
    if (!group) return null
    return group as GroupRecord
  }

  async putGroup(group: GroupRecord) {
    const soul = `${PREFIX}/groups/${group.id}`
    await this.adapter.put(soul, group)
  }

  async deleteGroup(groupId: string) {
    const soul = `${PREFIX}/groups/${groupId}`
    await this.adapter.delete(soul)
    // TODO: delete all memberships
  }

  async getMembership(groupId: string, userId: string) {
    const soul = `${PREFIX}/groups/${groupId}/members/${userId}`
    const membership = await this.adapter.get(soul)
    if (!membership) return null
    return membership as MembershipRecord
  }

  async putMembership(membership: MembershipRecord) {
    const soul = `${PREFIX}/groups/${membership.groupId}/members/${membership.userId}`
    await this.adapter.put(soul, membership)
  }

  async deleteMembership(groupId: string, userId: string) {
    const soul = `${PREFIX}/groups/${groupId}/members/${userId}`
    await this.adapter.delete(soul)
  }

  async getDocument(documentId: string) {
    const soul = `${PREFIX}/documents/${documentId}`
    const document = await this.adapter.get(soul)
    if (!document) return null
    return document as DocumentRecord
  }

  async putDocument(document: DocumentRecord) {
    const soul = `${PREFIX}/documents/${document.id}`
    await this.adapter.put(soul, document)
  }

  async deleteDocument(documentId: string) {
    const soul = `${PREFIX}/documents/${documentId}`
    await this.adapter.delete(soul)
  }

  async getGrant(documentId: string, userOrGroupId: string) {
    const soul = `${PREFIX}/documents/${documentId}/grants/${userOrGroupId}`
    const grant = await this.adapter.get(soul)
    if (!grant) return null
    return grant as GrantRecord
  }

  async putGrant(grant: GrantRecord) {
    const soul = `${PREFIX}/documents/${grant.documentId}/grants/${grant.userOrGroupId}`
    await this.adapter.put(soul, grant)
  }

  async deleteGrant(documentId: string, userOrGroupId: string) {
    const soul = `${PREFIX}/documents/${documentId}/grants/${userOrGroupId}`
    await this.adapter.delete(soul)
  }

  async getIsGroupAdmin(groupId: string, userId: string) {
    const membership = await this.getMembership(groupId, userId)
    return !!(membership && membership.encGroupCryptPrivKey)
  }

  async getHasAccess(userId: string, documentId: string) {
    throw new Error('Not yet implemented')
    return false
  }

  close() {
    this.adapter.close()
  }
}
