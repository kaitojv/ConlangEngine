import { Extension } from '@tiptap/core';

export const Indent = Extension.create({
    name: 'indent',

    addOptions() {
        return {
            types: ['paragraph', 'heading'],
            minLevel: 0,
            maxLevel: 8,
            indentSize: 1.25, // 1.25rem (20px) per indent level to match bullet list alignment exactly
        };
    },

    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    indent: {
                        default: 0,
                        parseHTML: element => {
                            if (element.closest && element.closest('li')) {
                                return 0;
                            }
                            const dataIndent = element.getAttribute('data-indent');
                            if (dataIndent) {
                                const parsed = parseInt(dataIndent, 10);
                                if (!isNaN(parsed) && parsed > 0) return parsed;
                            }
                            const styleIndent = element.style.marginInlineStart || element.style.marginLeft;
                            if (styleIndent) {
                                const num = parseFloat(styleIndent);
                                if (!isNaN(num) && num > 0) {
                                    if (styleIndent.endsWith('rem')) {
                                        return Math.max(0, Math.min(this.options.maxLevel, Math.round(num / this.options.indentSize)));
                                    }
                                    if (styleIndent.endsWith('px')) {
                                        return Math.max(0, Math.min(this.options.maxLevel, Math.round(num / (this.options.indentSize * 16))));
                                    }
                                }
                            }
                            return 0;
                        },
                        renderHTML: attributes => {
                            const indent = attributes.indent;
                            if (!indent || indent <= 0) {
                                return {};
                            }
                            const size = indent * this.options.indentSize;
                            return {
                                'data-indent': indent,
                                style: `margin-left: ${size}rem; margin-inline-start: ${size}rem;`,
                            };
                        },
                    },
                },
            },
        ];
    },

    addCommands() {
        const setNodeIndent = (tr, pos, node, delta, options) => {
            const currentIndent = node.attrs.indent || 0;
            const nextIndent = Math.min(
                options.maxLevel,
                Math.max(options.minLevel, currentIndent + delta)
            );
            if (nextIndent !== currentIndent) {
                tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: nextIndent === 0 ? null : nextIndent,
                });
                return true;
            }
            return false;
        };

        const updateIndent = (tr, dispatch, delta, options) => {
            const { doc, selection } = tr;
            if (!selection) return false;
            const { from, to } = selection;

            let changed = false;

            doc.nodesBetween(from, to, (node, pos, parent) => {
                if (options.types.includes(node.type.name)) {
                    // Do not indent paragraph when inside a list item (lists handle their own hierarchy via sinkListItem)
                    if (parent?.type?.name === 'listItem') {
                        return false;
                    }
                    if (setNodeIndent(tr, pos, node, delta, options)) {
                        changed = true;
                    }
                    return false;
                }
            });

            if (changed && dispatch) {
                dispatch(tr);
            }
            return changed;
        };

        return {
            indent: () => ({ tr, dispatch, editor }) => {
                if (editor.can().sinkListItem('listItem')) {
                    return dispatch ? editor.commands.sinkListItem('listItem') : true;
                }
                return updateIndent(tr, dispatch, 1, this.options);
            },
            outdent: () => ({ tr, dispatch, editor }) => {
                if (editor.can().liftListItem('listItem')) {
                    return dispatch ? editor.commands.liftListItem('listItem') : true;
                }
                return updateIndent(tr, dispatch, -1, this.options);
            },
        };
    },

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                if (this.editor.isActive('table')) {
                    return false; // let table navigation handle Tab
                }
                if (this.editor.isActive('codeBlock')) {
                    return false;
                }
                if (this.editor.can().sinkListItem('listItem')) {
                    return this.editor.commands.sinkListItem('listItem');
                }
                return this.editor.commands.indent();
            },
            'Shift-Tab': () => {
                if (this.editor.isActive('table')) {
                    return false; // let table navigation handle Shift+Tab
                }
                if (this.editor.isActive('codeBlock')) {
                    return false;
                }
                if (this.editor.can().liftListItem('listItem')) {
                    return this.editor.commands.liftListItem('listItem');
                }
                return this.editor.commands.outdent();
            },
            Backspace: () => {
                const { selection } = this.editor.state;
                const { $from, empty } = selection;
                if (!empty || $from.parentOffset !== 0) {
                    return false;
                }
                const parent = $from.parent;
                if (this.options.types.includes(parent.type.name) && (parent.attrs.indent || 0) > 0) {
                    return this.editor.commands.outdent();
                }
                return false;
            },
        };
    },
});

export default Indent;
