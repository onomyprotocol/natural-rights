interface ClientInterface {
  userId: string
  deviceId: string
  service: ServiceInterface

  registerUser: () => Promise<void>
  authorizeDevice: (deviceId: string) => Promise<void>
  deauthorizeDevice: (deviceId: string) => Promise<void>

  createGroup: () => Promise<string>
  addAdminToGroup: (groupId: string, userId: string) => Promise<void>
  removeAdminFromGroup: (groupId: string, userId: string) => Promise<void>
  addReaderToGroup: (groupId: string, userId: string) => Promise<void>
  addSignerToGroup: (groupId: string, userId: string) => Promise<void>
  removeMemberFromGroup: (groupId: string, userId: string) => Promise<void>

  createDocument: () => Promise<{
    id: string
    cryptKeyPair: KeyPair
  }>

  updateDocumentEncryption: (documentId: string) => Promise<KeyPair>

  grantReadAccess: (documentId: string, kind: GrantKind, id: string) => Promise<void>
  grantSignAccess: (documentId: string, kind: GrantKind, id: string) => Promise<void>
  revokeAccess: (documentId: string, kind: GrantKind, id: string) => Promise<void>

  signDocumentHashes: (documentId: string, hashesToSign: string[]) => Promise<string[]> // signature as document id from proxy
  signDocumentTexts: (documentId: string, textsToSign: string[]) => Promise<string[]> // signature as document id from proxy

  encryptDocumentTexts: (documentId: string, ciphertexts: string[]) => Promise<string[]>
  decryptDocumentTexts: (documentId: string, ciphertexts: string[]) => Promise<string[]>

  decryptDocumentEncryptionKey: (documentId: string) => Promise<string>
}

interface KeyPair {
  pubKey: string
  privKey: string
}

interface PrimitivesInterface {
  cryptKeyGen: () => Promise<KeyPair>
  cryptTransformKeyGen: (
    fromKeyPair: KeyPair,
    toPubKey: string,
    signKeyPair: KeyPair
  ) => Promise<string>
  signKeyGen: () => Promise<KeyPair>
  signTransformKeyGen?: (fromKeyPair: KeyPair, toPubKey: string) => Promise<string>
  encrypt: (pubKey: string, plaintext: string, signKeyPair: KeyPair) => Promise<string>
  cryptTransform: (
    transformKey: string,
    ciphertext: string,
    signKeyPair: KeyPair
  ) => Promise<string>
  decrypt: (keyPair: KeyPair, ciphertext: string) => Promise<string>

  sign: (keyPair: KeyPair, text: string) => Promise<string>
  signTransform?: (transformKey: string, signature: string) => Promise<string>
  verify: (pubKey: string, signature: string, text: string) => Promise<boolean>
}

interface SEAPrimitivesInterface {
  signKeyGen: () => Promise<KeyPair>
  hashForSignature: (text: string) => Promise<string>
  signHash: (hash: string, signKeyPair: KeyPair) => Promise<string>
  verifyHashSignature: (hash: string, signature: string, pubKey: string) => Promise<boolean>
  cryptKeyGen: () => Promise<KeyPair>
  encrypt: (pubKey: string, plaintext: string) => Promise<string>
  decrypt: (privKey: string, ciphertext: string) => Promise<string>
  readNodeKey: (node: any, key: string, pair: string | boolean) => Promise<any>
  hashNodeKey: (node: any, key: string) => Promise<string>
  verifyNode: (node: any) => Promise<boolean>
}

interface ServiceInterface {
  primitives: PrimitivesInterface
  sea: SEAPrimitivesInterface
  request: (request: NaturalRightsRequest) => Promise<NaturalRightsResponse>
}

type ActionType =
  | 'InitializeUser'
  | 'Login'
  | `RegisterDevice`
  | 'AddDevice'
  | 'RemoveDevice'
  | 'AuthorizeDevice'
  | 'CreateGroup'
  | 'AddMemberToGroup'
  | 'RemoveMemberFromGroup'
  | 'AddAdminToGroup'
  | 'RemoveAdminFromGroup'
  | 'CreateDocument'
  | 'SignDocument'
  | 'GrantAccess'
  | 'DecryptDocument'
  | 'RevokeAccess'
  | 'UpdateDocument'
  | 'GetPubKeys'
  | 'GetKeyPairs'

interface Action<T> {
  type: ActionType
  payload: T
}

type ResultType =
  | null
  | InitializeUserResult
  | LoginResult
  | RegisterDeviceResult
  | AddDeviceResult
  | RemoveDeviceResult
  | AuthorizeDeviceResult
  | CreateGroupResult
  | AddMemberToGroupResult
  | RemoveMemberFromGroupResult
  | AddAdminToGroupResult
  | RemoveAdminFromGroupResult
  | CreateDocumentResult
  | SignDocumentResult
  | GrantAccessResult
  | DecryptDocumentResult
  | RevokeAccessResult
  | UpdateDocumentResult
  | GetPubKeysResult
  | GetKeyPairsResult

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
  getDocumentGrants: (documentSoul: string) => Promise<GrantRecord[]>
  close: () => void
}

type GrantKind = 'user' | 'group'
type SignatureKind = 'user' | 'device' | 'group' | 'document'

interface DatabaseInterface {
  getUser: (id: string) => Promise<UserRecord | null>
  putUser: (user: UserRecord) => Promise<void>
  deleteUser: (userId: string) => Promise<void>
  getDevice: (deviceId: string) => Promise<DeviceRecord | null>
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
  getDocumentGrants: (documentId: string) => Promise<GrantRecord[]>
  deleteDocument: (documentId: string) => Promise<void>
  getGrant: (docId: string, kind: GrantKind, id: string) => Promise<GrantRecord | null>
  putGrant: (grant: GrantRecord) => Promise<void>
  deleteGrant: (docId: string, kind: GrantKind, id: string) => Promise<void>
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
  cryptPubKey: string
  signPubKey: string
  encCryptPrivKey: string
  encSignPrivKey: string
  rootDocumentId: string
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
  id: string // is signPubKey
  userId: string
  cryptPubKey: string
  encCryptPrivKey: string

  encSignPrivKey: string
}

interface MembershipRecord {
  // /groups/:groupId/memberships/:userId
  groupId: string
  userId: string

  cryptTransformKey: string

  canSign: boolean

  // Present for admins
  encGroupCryptPrivKey: string
}

interface DocumentRecord {
  // /documents/:documentId
  id: string // is signPubKey

  cryptUserId: string
  cryptPubKey: string
  encCryptPrivKey: string

  creatorId: string

  signPrivKey: string
}

interface GrantRecord {
  // /documents/:documentId/grants/:kind/:id
  documentId: string
  id: string // either userId or grantId
  kind: GrantKind
  encCryptPrivKey: string

  canSign: boolean
}

type NaturalRightsAction = Action<
  | InitializeUserAction
  | LoginAction
  | AddDeviceAction
  | RemoveDeviceAction
  | AuthorizeDeviceAction
  | CreateGroupAction
  | AddMemberToGroupAction
  | RemoveMemberFromGroupAction
  | AddAdminToGroupAction
  | RemoveAdminFromGroupAction
  | CreateDocumentAction
  | SignDocumentAction
  | GrantAccessAction
  | DecryptDocumentAction
  | RevokeAccessAction
  | UpdateDocumentAction
  | GetPubKeysAction
  | GetKeyPairsAction
>

interface NaturalRightsRequest {
  userId: string
  deviceId: string
  signature: string
  body: string
}

interface NaturalRightsResponse {
  results: Result[]
}

interface InitializeUserAction {
  userId: string
  signPubKey: string
  cryptPubKey: string
  encCryptPrivKey: string
  encSignPrivKey: string
  rootDocCryptPubKey: string
  rootDocEncCryptPrivKey: string
}

interface InitializeUserResult extends InitializeUserAction {}

interface LoginAction {
  cryptPubKey: string
}

interface LoginResult extends LoginAction {
  rootDocumentId: string
  userId: string
}

interface RegisterDeviceAction {
  cryptPubKey: string
  signPubKey: string
}

interface RegisterDeviceResult {
  deviceId: string
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

interface AuthorizeDeviceAction {
  deviceId: string
  userId: string
  cryptTransformKey: string
}

interface AuthorizeDeviceResult {
  deviceId: string
  userId: string
}

interface RemoveDeviceAction {
  deviceId: string
  userId: string
}

interface RemoveDeviceResult extends RemoveDeviceAction {}

interface CreateGroupAction {
  groupId: string
  userId: string
  cryptPubKey: string
  encCryptPrivKey: string
  encSignPrivKey: string
}

interface CreateGroupResult extends CreateGroupAction {}

interface AddMemberToGroupAction {
  groupId: string
  userId: string
  cryptTransformKey: string

  canSign?: boolean
}

interface AddMemberToGroupResult {
  groupId: string
  userId: string

  canSign: boolean
}

interface RemoveMemberFromGroupAction {
  groupId: string
  userId: string
}

interface RemoveMemberFromGroupResult extends RemoveAdminFromGroupAction {}

interface AddAdminToGroupAction {
  groupId: string
  userId: string
  encCryptPrivKey: string
}

interface AddAdminToGroupResult extends AddAdminToGroupAction {}

interface RemoveAdminFromGroupAction {
  groupId: string
  userId: string
}

interface RemoveAdminFromGroupResult extends RemoveAdminFromGroupAction {}

interface CreateDocumentAction {
  cryptUserId: string
  cryptPubKey: string

  creatorId: string
  encCryptPrivKey: string
}

interface CreateDocumentResult extends CreateDocumentAction {
  documentId: string
}

interface SignDocumentAction {
  documentId: string
  userId: string
  hashes: string[]
}

interface SignDocumentResult extends SignDocumentAction {
  signatures: string[]
}

interface GrantAccessAction {
  documentId: string
  kind: GrantKind
  id: string
  encCryptPrivKey: string

  canSign?: boolean
}

interface GrantAccessResult extends GrantAccessAction {}

interface DecryptDocumentAction {
  documentId: string
}

interface DecryptDocumentResult extends DecryptDocumentAction {
  encCryptPrivKey: string
}

interface RevokeAccessAction {
  documentId: string
  kind: GrantKind
  id: string
}

interface RevokeAccessResult extends RevokeAccessAction {}

interface UpdateDocumentAction {
  documentId: string
  cryptUserId: string
  cryptPubKey: string
  encCryptPrivKey: string
}

interface UpdateDocumentResult extends UpdateDocumentAction {}

interface GetPubKeysAction {
  kind: GrantKind
  id: string
}

interface GetPubKeysResult extends GetPubKeysAction {
  signPubKey: string
  cryptPubKey: string
}

interface GetKeyPairsAction {
  kind: GrantKind
  id: string
}

interface GetKeyPairsResult extends GetKeyPairsAction {
  signPubKey: string
  encSignPrivKey: string
  cryptPubKey: string
  encCryptPrivKey: string
}

/**
 * Used by Client App WebView to interact with Natural Rights
 */
interface NaturalRightsAppService {
  /**
   * Generate device keys and register a new user account
   *
   * The returned secrets should be stored and the caller must fulfill the
   * returned DID request to complete signup.
   *
   * @returns a Promise resolving device secrets and a DID request token.
   */
  signup(): Promise<{
    DIDRequestToken: string // Caller is expected to fulfill DID request to complete signup
    secrets: DeviceSecrets // Caller is expected to permanently and securely store
  }>

  /**
   * Authorize another device to access the account associated with given device keys
   *
   * @param deviceSecrets Returned from signup (should be stored)
   * @param deviceToAuthId Provided by other app/device QR Code
   * @param durationInMs Max amount of time device should be authorized
   * @param idleTimeoutInMs How long the device can be idle before being de-authorized
   *
   * @returns a Promise
   */
  authorize(
    deviceSecrets: DeviceSecrets,
    deviceToAuthId: string,
    durationInMs?: number,
    idleTimeoutInMs?: number
  ): Promise<void>

  /**
   * Revoke authorization for another device from the account associated with given device keys
   *
   * @param deviceSecrets Returned from signup (should be stored)
   * @param deviceToAuthId From list of active sessions
   *
   * @returns a Promise
   */
  deauthorize(deviceSecrets: DeviceSecrets, deviceToDeauthId: string): Promise<void>

  /**
   * Resolves a list of currently active devices for potential deauthorization
   *
   * @returns a Promise resolving an array of {ActiveDevice}'s
   */
  getActiveDevices(): Promise<ActiveDevice[]>
}

/**
 * Secrets representing a device in Natural Rights
 */
interface DeviceSecrets {
  cryptKeyPair: KeyPair
  signKeyPair: KeyPair
}

/**
 * A device authorized to access the user
 */
interface ActiveDevice {
  id: string
  authorized: number
  expires: number
  idleTimeoutInMs: number
}
