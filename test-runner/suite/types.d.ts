export type UriString = string;
export type DocumentUri = UriString;

export interface OnSpellCheckDocumentStep extends NotificationInfo {
    /**
     * uri of the text document
     */
    uri: DocumentUri;

    /**
     *
     */
    version: number;

    /**
     * name of step.
     */
    step: string;

    /**
     * Number of issues found
     */
    numIssues?: number;

    /**
     * true if it is finished
     */
    done?: boolean;
}

export interface NotificationInfo {
    /**
     * Sequence number.
     * Notifications can be sorted based upon the sequence number to give the order
     * in which the Notification was generated.
     * It should be unique between Notifications of the same type.
     */
    seq: number;

    /**
     * timestamp in ms.
     */
    ts: number;
}

export interface WorkspaceConfigForDocumentRequest {
    uri: DocumentUri;
}
