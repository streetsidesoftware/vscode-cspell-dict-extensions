export interface Folder {
    name?: string;
    path: string;
}

export interface CodeWorkspace {
    folders: Folder[];
    settings: Record<string, unknown>;
}
