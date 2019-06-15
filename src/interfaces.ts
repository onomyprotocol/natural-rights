interface ClientInterface {
  userId: string
  deviceId: string
  service: ServiceInterface

  initializeUser: () => Promise<void>
  addDevice: (deviceId: string) => Promise<void>
  removeDevice: (deviceId: string) => Promise<void>
  createGroup: (groupId: string) => Promise<void>
  addMemberToGroup: (groupId: string, userId: string) => Promise<void>
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>
  addAdminToGroup: (groupId: string, userId: string) => Promise<void>
  removeAdminFromGroup: (groupId: string, userId: string) => Promise<void>
  encryptDocument: (documentId: string) => Promise<string>
  grantAccess: (documentId: string, userOrGroupId: string) => Promise<void>
  decryptDocument: (documentId: string) => Promise<string>
  revokeAccess: (documentId: string, userOrGroupId: string) => Promise<void>
  updateDocument: (documentId: string) => Promise<string>
}

interface KeyPair {
  pubKey: string
  privKey: string
}

interface PrimitivesInterface {
  cryptKeyGen: () => Promise<KeyPair>
  signKeyGen: () => Promise<KeyPair>
  cryptTransformKeyGen: (fromKeyPair: KeyPair, toPubKey: string) => Promise<string>
  encrypt: (pubKey: string, plaintext: string) => Promise<string>
  cryptTransform: (transformKey: string, ciphertext: string) => Promise<string>
  decrypt: (keyPair: KeyPair, ciphertext: string) => Promise<string>
  sign: (keyPair: KeyPair, text: string) => Promise<string>
  verify: (pubKey: string, signature: string, text: string) => Promise<boolean>
}

interface ServiceInterface {
  primitives: PrimitivesInterface
  request: (request: NaturalRightsRequest) => Promise<NaturalRightsResponse>
}

interface RequestFactoryInterface {
  userId: string
  deviceId: string

  sign: (actions: Action<any>[]) => Promise<NaturalRightsRequest>

  initializeUser: () => {
    deviceCryptPrivKey: string
    deviceSignPrivKey: string
    actions: [Action<InitializeUserAction>, Action<AddDeviceAction>]
  }

  addDevice: (
    userCryptPrivKey: string,
    deviceId: string
  ) => {
    deviceCryptPrivKey: string
    deviceSignPrivKey: string
    actions: [Action<AddDeviceAction>]
  }

  removeDevice: (
    deviceId: string
  ) => {
    actions: [Action<RemoveDeviceAction>]
  }

  createGroup: (
    groupId: string
  ) => {
    actions: [
      Action<CreateGroupAction>,
      Action<AddMemberToGroupAction>,
      Action<AddAdminToGroupAction>
    ]
  }

  addMemberToGroup: (
    groupCryptPrivKey: string,
    groupId: string,
    userId: string,
    userCryptPubKey: string
  ) => {
    actions: [Action<AddMemberToGroupAction>]
  }

  removeMemberFromGroup: (
    groupId: string,
    userId: string
  ) => {
    actions: [Action<RemoveMemberFromGroupAction>]
  }

  addAdminToGroup: (
    groupId: string,
    groupCryptPrivKey: string,
    userId: string,
    userCryptPubKey: string
  ) => {
    actions: [Action<AddMemberToGroupAction>, Action<AddAdminToGroupAction>]
  }

  removeAdminFromGroup: (
    groupId: string,
    userId: string
  ) => {
    actions: [Action<RemoveAdminFromGroupAction>]
  }

  encryptDocument: (
    documentId: string
  ) => {
    docCryptPrivKey: string
    docCryptPubKey: string
    actions: [Action<EncryptDocumentAction>]
  }

  grantAccess: (
    documentId: string,
    userId: string
  ) => {
    actions: [Action<GrantAccessAction>]
  }

  decryptDocument: (
    documentId: string
  ) => {
    actions: [Action<DecryptDocumentAction>]
  }

  revokeAccess: (
    documentId: string,
    userId: string
  ) => {
    actions: [Action<RevokeAccessAction>]
  }

  updateDocument: (
    documentId: string
  ) => {
    docCryptPrivKey: string
    docCryptPubKey: string
    actions: [Action<UpdateDocumentAction>]
  }
}

type ActionType =
  | 'InitializeUser'
  | 'AddDevice'
  | 'RemoveDevice'
  | 'CreateGroup'
  | 'AddMemberToGroup'
  | 'RemoveMemberFromGroup'
  | 'AddAdminToGroup'
  | 'RemoveAdminFromGroup'
  | 'EncryptDocument'
  | 'GrantAccess'
  | 'DecryptDocument'
  | 'RevokeAccess'
  | 'UpdateDocument'

interface Action<T> {
  type: ActionType
  payload: T
}

type ResultType =
  | null
  | InitializeUserResult
  | AddDeviceResult
  | RemoveDeviceResult
  | CreateGroupResult
  | AddMemberToGroupResult
  | RemoveMemberFromGroupResult
  | AddAdminToGroupResult
  | RemoveAdminFromGroupResult
  | EncryptDocumentResult
  | GrantAccessResult
  | DecryptDocumentResult
  | RevokeAccessResult
  | UpdateDocumentResult

interface Result {
  type: ActionType
  payload: ResultType

  success: boolean
  error: string
}

// Database

interface DatabaseAdapterInterface {
  get: (soul: string) => Promise<DatabaseRecord>
  put: (soul: string, data: DatabaseRecord) => Promise<void>
  delete: (soul: string) => Promise<void>
  close: () => void
}

interface DatabaseInterface {
  getUser: (id: string) => Promise<UserRecord | null>
  putUser: (user: UserRecord) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  getDevice: (userId: string, deviceId: string) => Promise<DeviceRecord | null>
  putDevice: (device: DeviceRecord) => Promise<void>
  deleteDevice: (userId: string, deviceId: string) => Promise<void>
  getGroup: (groupId: string) => Promise<GroupRecord | null>
  putGroup: (group: GroupRecord) => Promise<void>
  deleteGroup: (groupId: string) => Promise<void>
  getMembership: (groupId: string, userId: string) => Promise<MembershipRecord | null>
  putMembership: (membership: MembershipRecord) => Promise<void>
  deleteMembership: (groupId: string, userId: string) => Promise<void>
  getDocument: (documentId: string) => Promise<DocumentRecord | null>
  putDocument: (document: DocumentRecord) => Promise<void>
  deleteDocument: (documentId: string) => Promise<void>
  getGrant: (docId: string, userOrGroupId: string) => Promise<GrantRecord | null>
  putGrant: (grant: GrantRecord) => Promise<void>
  deleteGrant: (docId: string, userOrGroupId: string) => Promise<void>
  getHasAccess: (userId: string, documentId: string) => Promise<boolean>
  getIsGroupAdmin: (groupId: string, userId: string) => Promise<boolean>
  close: () => void
}

type DatabaseRecord =
  | UserRecord
  | DeviceRecord
  | GroupRecord
  | MembershipRecord
  | DocumentRecord
  | GrantRecord
  | null

interface UserRecord {
  // /users/:userId
  id: string
  signPubKey: string
  cryptPubKey: string
  encCryptPrivKey: string
  encSignPrivKey: string
}

interface DeviceRecord {
  // /users/:userId/devices/:deviceId
  id: string
  userId: string
  signPubKey: string
  cryptPubKey: string

  cryptTransformKey: string
}

interface GroupRecord {
  // /groups/:groupId
  id: string
  cryptPubKey: string
  encCryptPrivKey: string
}

interface MembershipRecord {
  // /groups/:groupId/memberships/:userId
  groupId: string
  userId: string

  cryptTransformKey: string

  // Present for admins
  encGroupSignPrivKey: string
  encGroupCryptPrivKey: string
}

interface DocumentRecord {
  // /documents/:documentId
  id: string
  userId: string
  encDecryptKey: string
}

interface GrantRecord {
  // /documents/:documentId/grants/:userOrGroupId
  documentId: string
  userOrGroupId: string
  encCryptPrivKey: string
}

type NaturalRightsAction = Action<
  | InitializeUserAction
  | AddDeviceAction
  | RemoveDeviceAction
  | CreateGroupAction
  | AddMemberToGroupAction
  | RemoveMemberFromGroupAction
  | AddAdminToGroupAction
  | RemoveAdminFromGroupAction
  | EncryptDocumentAction
  | GrantAccessAction
  | DecryptDocumentAction
  | RevokeAccessAction
  | UpdateDocumentAction
>

interface NaturalRightsRequest {
  userId: string
  deviceId: string
  signature: string
  body: string
  actions: NaturalRightsAction[]
}

interface NaturalRightsResponse {
  results: Result[]
}

interface InitializeUserAction {
  userId: string
  cryptPubKey: string
  signPubKey: string
  encCryptPrivKey: string
  encSignPrivKey: string
}

interface InitializeUserResult {
  userId: string
  cryptPubKey: string
  signPubKey: string
  encCryptPrivKey: string
  encSignPrivKey: string
}

interface AddDeviceAction {
  deviceId: string
  userId: string
  cryptPubKey: string
  signPubKey: string
  cryptTransformKey: string
}

interface AddDeviceResult {
  deviceId: string
  userId: string
  cryptPubKey: string
  signPubKey: string
}

interface RemoveDeviceAction {
  deviceId: string
  userId: string
}

interface RemoveDeviceResult {
  deviceId: string
  userId: string
}

interface CreateGroupAction {
  groupId: string
  userId: string
  cryptPubKey: string
  encCryptPrivKey: string
}

interface CreateGroupResult {
  groupId: string
  userId: string
  cryptPubKey: string
  encCryptPrivKey: string
}

interface AddMemberToGroupAction {
  groupId: string
  userId: string
  cryptTransformKey: string
}

interface AddMemberToGroupResult {
  groupId: string
  userId: string
}

interface RemoveMemberFromGroupAction {
  groupId: string
  userId: string
}

interface RemoveMemberFromGroupResult {
  groupId: string
  userId: string
}

interface AddAdminToGroupAction {
  groupId: string
  userId: string
  encCryptPrivKey: string
}

interface AddAdminToGroupResult {
  groupId: string
  userId: string
  encCryptPrivKey: string
}

interface RemoveAdminFromGroupAction {
  groupId: string
  userId: string
}

interface RemoveAdminFromGroupResult {
  groupId: string
  userId: string
}

interface EncryptDocumentAction {
  documentId: string
  userId: string
  encCryptPrivKey: string
}

interface EncryptDocumentResult {
  documentId: string
  userId: string
  encCryptPrivKey: string
}

interface GrantAccessAction {
  documentId: string
  userId: string
  encCryptPrivKey: string
}

interface GrantAccessResult {
  documentId: string
  userId: string
  encCryptPrivKey: string
}

interface DecryptDocumentAction {
  documentId: string
}

interface DecryptDocumentResult {
  documentId: string
  encCryptPrivKey: string
}

interface RevokeAccessAction {
  documentId: string
  userId: string
}

interface RevokeAccessResult {
  documentId: string
  userId: string
}

interface UpdateDocumentAction {
  documentId: string
  userId: string
  encCryptPrivKey: string
}

interface UpdateDocumentResult {
  documentId: string
  userId: string
  encCryptPrivKey: string
}
