import type { EndOptions, XmlDeclaration } from './types.js';

interface NodeData {
  tag: string;
  attributes: Record<string, string>;
  children: Array<NodeData | TextNode | CdataNode | CommentNode>;
  parent: NodeData | null;
}

interface TextNode {
  type: 'text';
  value: string;
}

interface CdataNode {
  type: 'cdata';
  value: string;
}

interface CommentNode {
  type: 'comment';
  value: string;
}

interface PiNode {
  type: 'pi';
  value: string;
}

interface RawNode {
  type: 'raw';
  value: string;
}

type ChildNode = NodeData | TextNode | CdataNode | CommentNode | PiNode | RawNode;

function isElementNode(n: ChildNode): n is NodeData {
  return !('type' in n);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function serializeNode(
  node: ChildNode,
  prettyPrint: boolean,
  indent: number,
  depth: number,
): string {
  const pad = prettyPrint ? ' '.repeat(depth * indent) : '';
  const nl = prettyPrint ? '\n' : '';

  if (!isElementNode(node)) {
    if (node.type === 'text') {
      return pad + node.value + nl;
    }
    if (node.type === 'cdata') {
      return `${pad}<![CDATA[${node.value}]]>${nl}`;
    }
    if (node.type === 'comment') {
      return `${pad}<!-- ${node.value} -->${nl}`;
    }
    if (node.type === 'pi') {
      return `${pad}<?${node.value}?>${nl}`;
    }
    if (node.type === 'raw') {
      return pad + node.value + nl;
    }
    return '';
  }

  const attrs = Object.entries(node.attributes)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('');

  if (node.children.length === 0) {
    return `${pad}<${node.tag}${attrs}/>${nl}`;
  }

  // Check if content is a single inline text node
  if (
    node.children.length === 1 &&
    !isElementNode(node.children[0]) &&
    (node.children[0] as TextNode | CdataNode | CommentNode).type === 'text'
  ) {
    const textVal = (node.children[0] as TextNode).value;
    return `${pad}<${node.tag}${attrs}>${textVal}</${node.tag}>${nl}`;
  }

  const childrenStr = node.children
    .map((c) => serializeNode(c, prettyPrint, indent, depth + 1))
    .join('');

  return `${pad}<${node.tag}${attrs}>${nl}${childrenStr}${pad}</${node.tag}>${nl}`;
}

/**
 * Fluent XML builder.
 *
 * Usage:
 * ```typescript
 * const xml = Xml.create('root')
 *   .ele('item').att('id', '1').txt('value').up()
 *   .end({ prettyPrint: true });
 * ```
 */
export class XmlBuilder {
  private root: NodeData;
  private current: NodeData;
  private declaration: XmlDeclaration | null;

  constructor(rootTag: string, declaration?: XmlDeclaration) {
    this.root = { tag: rootTag, attributes: {}, children: [], parent: null };
    this.current = this.root;
    this.declaration = declaration ?? null;
  }

  /**
   * Add a child element and descend into it.
   */
  ele(tag: string): this {
    const child: NodeData = {
      tag,
      attributes: {},
      children: [],
      parent: this.current,
    };
    this.current.children.push(child);
    this.current = child;
    return this;
  }

  /**
   * Add an attribute to the current element.
   */
  att(name: string, value: string): this {
    this.current.attributes[name] = value;
    return this;
  }

  /**
   * Add a text node to the current element.
   */
  txt(value: string): this {
    this.current.children.push({ type: 'text', value: escapeXml(value) });
    return this;
  }

  /**
   * Add a CDATA section to the current element.
   */
  cdata(value: string): this {
    this.current.children.push({ type: 'cdata', value });
    return this;
  }

  /**
   * Add an XML comment to the current element.
   */
  comment(text: string): this {
    this.current.children.push({ type: 'comment', value: text });
    return this;
  }

  /**
   * Ascend to the parent element.
   */
  up(): this {
    if (this.current.parent) {
      this.current = this.current.parent;
    }
    return this;
  }

  /**
   * Add a namespace declaration attribute to the current element.
   *
   * @param prefix - Namespace prefix (use '' for default namespace).
   * @param uri - Namespace URI.
   */
  ns(prefix: string, uri: string): this {
    const attrName = prefix === '' ? 'xmlns' : `xmlns:${prefix}`;
    this.current.attributes[attrName] = uri;
    return this;
  }

  /**
   * Add a processing instruction to the current element.
   *
   * @param target - Processing instruction target (e.g. 'xml-stylesheet').
   * @param content - Processing instruction content.
   */
  pi(target: string, content: string): this {
    this.current.children.push({ type: 'pi', value: `${target} ${content}` });
    return this;
  }

  /**
   * Inject a raw XML string as a child of the current element (no escaping applied).
   * Use with care — no well-formedness check is performed.
   *
   * @param rawXml - Raw XML string to embed.
   */
  raw(rawXml: string): this {
    this.current.children.push({ type: 'raw', value: rawXml });
    return this;
  }

  /**
   * Serialize the built XML tree to a string.
   *
   * @param options - End options (prettyPrint, indent).
   */
  end(options: EndOptions = {}): string {
    const prettyPrint = options.prettyPrint ?? false;
    const indent = options.indent ?? 2;
    const nl = prettyPrint ? '\n' : '';

    let decl = '';
    if (this.declaration) {
      const version = this.declaration.version ?? '1.0';
      const encoding = this.declaration.encoding ?? 'UTF-8';
      const standalone = this.declaration.standalone
        ? ` standalone="${this.declaration.standalone}"`
        : '';
      decl = `<?xml version="${version}" encoding="${encoding}"${standalone}?>${nl}`;
    }

    return decl + serializeNode(this.root, prettyPrint, indent, 0).trimEnd();
  }
}
