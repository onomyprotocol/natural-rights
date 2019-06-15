const PREFIX = ``

export const Souls = {
  user: (userId: string) => `${PREFIX}/users/${userId}`,
  device: (userId: string, deviceId: string) => `${PREFIX}/users/${userId}/devices/${deviceId}`,
  group: (groupId: string) => `${PREFIX}/groups/${groupId}`,
  membership: (groupId: string, userId: string) => `${PREFIX}/groups/${groupId}/members/${userId}`,
  document: (documentId: string) => `${PREFIX}/documents/${documentId}`,
  grant: (documentId: string, kind: GrantKind, id: string) =>
    `${PREFIX}/documents/${documentId}/grants/${kind}/${id}`
}

export class Database implements DatabaseInterface {
  adapter: DatabaseAdapterInterface

  constructor(adapter: DatabaseAdapterInterface) {
    this.adapter = adapter
  }

  async getUser(userId: string) {
    const soul = Souls.user(userId)
    const user = await this.adapter.get(soul)
    if (!user) return null
    return user as UserRecord
  }

  async putUser(user: UserRecord) {
    const soul = Souls.user(user.id)
    await this.adapter.put(soul, user)
  }

  async deleteUser(userId: string) {
    const soul = Souls.user(userId)
    await this.adapter.delete(soul)
    // TODO: Delete all associated devices
    // TODO: Delete all documents?
  }

  async getDevice(userId: string, deviceId: string) {
    const soul = Souls.device(userId, deviceId)
    const device = await this.adapter.get(soul)
    if (!device) return null
    return device as DeviceRecord
  }

  async putDevice(device: DeviceRecord) {
    const soul = Souls.device(device.userId, device.id)
    await this.adapter.put(soul, device)
  }

  async deleteDevice(userId: string, deviceId: string) {
    const soul = Souls.device(userId, deviceId)
    await this.adapter.delete(soul)
  }

  async getGroup(groupId: string) {
    const soul = Souls.group(groupId)
    const group = await this.adapter.get(soul)
    if (!group) return null
    return group as GroupRecord
  }

  async putGroup(group: GroupRecord) {
    const soul = Souls.group(group.id)
    await this.adapter.put(soul, group)
  }

  async deleteGroup(groupId: string) {
    const soul = Souls.group(groupId)
    await this.adapter.delete(soul)
    // TODO: delete all memberships
  }

  async getMembership(groupId: string, userId: string) {
    const soul = Souls.membership(groupId, userId)
    const membership = await this.adapter.get(soul)
    if (!membership) return null
    return membership as MembershipRecord
  }

  async putMembership(membership: MembershipRecord) {
    const soul = Souls.membership(membership.groupId, membership.userId)
    await this.adapter.put(soul, membership)
  }

  async deleteMembership(groupId: string, userId: string) {
    const soul = Souls.membership(groupId, userId)
    await this.adapter.delete(soul)
  }

  async getDocument(documentId: string) {
    const soul = Souls.document(documentId)
    const document = await this.adapter.get(soul)
    if (!document) return null
    return document as DocumentRecord
  }

  async putDocument(document: DocumentRecord) {
    const soul = Souls.document(document.id)
    await this.adapter.put(soul, document)
  }

  async deleteDocument(documentId: string) {
    const soul = Souls.document(documentId)
    await this.adapter.delete(soul)
  }

  async getDocumentGrants(documentId: string) {
    const soul = Souls.document(documentId)
    return this.adapter.getDocumentGrants(soul)
  }

  async getGrant(documentId: string, kind: GrantKind, id: string) {
    const soul = Souls.grant(documentId, kind, id)
    const grant = await this.adapter.get(soul)
    if (!grant) return null
    return grant as GrantRecord
  }

  async putGrant(grant: GrantRecord) {
    const soul = Souls.grant(grant.documentId, grant.kind, grant.id)
    await this.adapter.put(soul, grant)
  }

  async deleteGrant(documentId: string, kind: GrantKind, id: string) {
    const soul = Souls.grant(documentId, kind, id)
    await this.adapter.delete(soul)
  }

  close() {
    this.adapter.close()
  }
}
