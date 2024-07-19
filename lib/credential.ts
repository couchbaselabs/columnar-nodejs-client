/**
 * ICredential specifies a credential which uses an RBAC
 * username and password to authenticate with the cluster.
 *
 * @category Authentication
 */
export interface ICredential {
  /**
   * The username to authenticate with.
   */
  username: string

  /**
   * The password to authenticate with.
   */
  password: string

  /**
   * The sasl mechanisms to authenticate with.
   */
  allowed_sasl_mechanisms?: string[]
}

/**
 * Credential implements a simple ICredential.
 *
 * @category Authentication
 */
export class Credential implements ICredential {
  /**
   * The username that will be used to authenticate with.
   */
  username: string

  /**
   * The password that will be used to authenticate with.
   */
  password: string

  /**
   * Constructs this Credential with the passed username and password.
   *
   * @param username The username to initialize this credential with.
   * @param password The password to initialize this credential with.
   */
  constructor(username: string, password: string) {
    this.username = username
    this.password = password
  }
}
