import type {
    Root,
    RootData,
    RootContent,
    Paragraph,
    ParagraphData,
    PhrasingContent,
    Heading,
    HeadingData,
    Text,
    TextData,
    List,
    ListData,
    ListItem,
    ListItemData,
    Link,
    LinkData,
    BlockContent,
} from 'mdast';

/**
 * Create a root node
 */
export function root(children: RootContent | RootContent[], data?: RootData): Root {
    return {
        type: 'root',
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

/**
 * Create a paragraph node
 */
export function paragraph(children: PhrasingContent | PhrasingContent[], data?: ParagraphData): Paragraph {
    return {
        type: 'paragraph',
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Create a heading node
 */
export function heading(depth: HeadingLevel, children: PhrasingContent | PhrasingContent[], data?: HeadingData): Heading {
    return {
        type: 'heading',
        depth,
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

/**
 * Create a text node
 */
export function text(value: string, data?: TextData): Text {
    return {
        type: 'text',
        value,
        data,
    };
}

/**
 * Create newline
 */
export function newLineText(): Paragraph {
    return paragraph([]);
}

/**
 * Create a list item node
 */
export function listItem(children: BlockContent | BlockContent[], data?: ListItemData): ListItem {
    return {
        type: 'listItem',
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

/**
 * Create a list node
 */
export function list(ordered: boolean | 'ordered' | 'unordered', children: ListItem[], data?: ListData): List {
    const isOrdered = ordered === 'ordered' ? true : ordered === 'unordered' ? false : ordered;
    return {
        type: 'list',
        ordered: isOrdered,
        children,
        data,
    };
}

/**
 * Create a link node
 */
export function link(url: string, children: PhrasingContent | PhrasingContent[], title?: string, data?: LinkData): Link {
    return {
        type: 'link',
        url,
        children: Array.isArray(children) ? children : [children],
        title,
        data,
    };
}
