export enum CustomErrorCodes {
    // -----------------------
    // - backend error codes -
    // -----------------------

    // Server errors
    // UD - user-defined, S - server error, 00  - error number
    ServerError = 'UDS000',
    UnexpectedRuntimeError = 'UDS001',
    UrlNotImplementedError = 'UDS002',
}
