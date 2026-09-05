export function captureDomFrame(root) {
    const entries = [];
    function visit(node) {
        const children = Array.from(node.childNodes);
        entries.push({
            node, children,
            attributes: node instanceof Element ? Array.from(node.attributes, attr => [attr.name, attr.value]) : null,
            text: node.nodeType === Node.TEXT_NODE ? node.nodeValue : null,
            data: node.__data__,
            listeners: node.__on?.map(listener => ({ ...listener })),
            listenerKeys: new Set(node.__on?.map(listener => `${listener.type}.${listener.name}`))
        });
        children.forEach(visit);
    }
    visit(root);
    return {
        restore() {
            for (const entry of entries) {
                const { node, children, attributes } = entry;
                if (node.childNodes.length !== children.length || children.some((child, i) => node.childNodes[i] !== child)) {
                    // insertBefore also reattaches previously detached exit/enter nodes.
                    for (let i = 0; i < children.length; i++) {
                        if (node.childNodes[i] !== children[i])
                            node.insertBefore(children[i], node.childNodes[i] ?? null);
                    }
                    while (node.childNodes.length > children.length)
                        node.removeChild(node.lastChild);
                }
                if (attributes && node instanceof Element) {
                    const names = new Set(attributes.map(([name]) => name));
                    for (const attr of Array.from(node.attributes))
                        if (!names.has(attr.name))
                            node.removeAttribute(attr.name);
                    for (const [name, value] of attributes)
                        if (node.getAttribute(name) !== value)
                            node.setAttribute(name, value);
                }
                if (entry.text !== null && node.nodeValue !== entry.text)
                    node.nodeValue = entry.text;
                entry.node.__data__ = entry.data;
                // Preserve external D3 listeners added after compilation under other
                // event namespaces. Only restore the handlers owned by this snapshot.
                const preserved = (entry.node.__on ?? []).filter(listener => {
                    if (!entry.listenerKeys.has(`${listener.type}.${listener.name}`))
                        return true;
                    node.removeEventListener(listener.type, listener.listener, listener.options);
                    return false;
                });
                const restored = entry.listeners?.map(listener => ({ ...listener })) ?? [];
                for (const listener of restored)
                    node.addEventListener(listener.type, listener.listener, listener.options);
                if (restored.length || preserved.length)
                    entry.node.__on = [...preserved, ...restored];
                else
                    delete entry.node.__on;
            }
        }
    };
}
