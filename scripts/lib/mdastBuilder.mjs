// @ts-check

/**
 * @typedef {import('mdast').Root} Root
 * @typedef {import('mdast').RootData} RootData
 * @typedef {import('mdast').RootContent} RootContent
 * @typedef {import('mdast').Paragraph} Paragraph
 * @typedef {import('mdast').ParagraphData} ParagraphData
 * @typedef {import('mdast').PhrasingContent} PhrasingContent
 * @typedef {import('mdast').Heading} Heading
 * @typedef {import('mdast').HeadingData} HeadingData
 * @typedef {import('mdast').Text} Text
 * @typedef {import('mdast').TextData} TextData
 * @typedef {import('mdast').List} List
 * @typedef {import('mdast').ListData} ListData
 * @typedef {import('mdast').ListItem} ListItem
 * @typedef {import('mdast').ListItemData} ListItemData
 * @typedef {import('mdast').Link} Link
 * @typedef {import('mdast').LinkData} LinkData
 * @typedef {import('mdast').BlockContent} BlockContent
 */

/**
 * Create a root node
 * @param {RootContent | RootContent[]} children
 * @param {RootData} [data]
 * @returns {Root}
 */
export function root(children, data) {
    return {
        type: 'root',
        children: Array.isArray(children) ? children : [children],
        data
    };
}

/**
 * Create a paragraph node
 * @param {PhrasingContent | PhrasingContent[]} children
 * @param {ParagraphData} [data]
 * @returns {Paragraph}
 */
export function paragraph(children, data) {
    return {
        type: 'paragraph',
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

/**
 * Create a heading node
 * @param {1 | 2 | 3 | 4 | 5 | 6} depth
 * @param {PhrasingContent | PhrasingContent[]} children
 * @param {HeadingData} [data]
 * @returns {Heading}
 */
export function heading(depth, children, data) {
    return {
        type: 'heading',
        depth,
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

/**
 *
 * @param {string} value
 * @param {TextData} [data]
 * @returns {Text}
 */
export function text(value, data) {
    return {
        type: 'text',
        value,
        data,
    };
}

/**
 * create a list node
 * @param {BlockContent | BlockContent[]} children
 * @param {ListItemData} [data]
 * @returns {ListItem}
 */
export function listItem(children, data) {
    return {
        type: 'listItem',
        children: Array.isArray(children) ? children : [children],
        data,
    };
}

/**
 *
 * @param {boolean | 'ordered' | 'unordered'} ordered
 * @param {ListItem[]} children
 * @param {ListData} [data]
 * @returns {List}
 */
export function list(ordered, children, data) {
    ordered = ordered === 'ordered' ? true : ordered === 'unordered' ? false : ordered;
    return {
        type: 'list',
        ordered,
        children,
        data,
    };
}

/**
 *
 * @param {string} url
 * @param {PhrasingContent | PhrasingContent[]} children
 * @param {string} [title]
 * @param {LinkData} [data]
 * @returns {Link}
 */
export function link(url, children, title, data) {
    return {
        type: 'link',
        url,
        children: Array.isArray(children) ? children : [children],
        title,
        data,
    };
}
