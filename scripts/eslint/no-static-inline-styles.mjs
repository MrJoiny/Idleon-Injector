function splitDeclarations(css) {
    const declarations = [];
    let declaration = "";
    let quote = "";
    let depth = 0;
    for (let index = 0; index < css.length; index++) {
        const char = css[index];
        if (!quote && char === "/" && css[index + 1] === "*") {
            const end = css.indexOf("*/", index + 2);
            index = end < 0 ? css.length : end + 1;
            continue;
        }
        if (char === "\\") {
            declaration += char + (css[++index] ?? "");
            continue;
        }
        if (quote) {
            if (char === quote) quote = "";
        } else if (char === '"' || char === "'") quote = char;
        else if (char === "(") depth++;
        else if (char === ")") depth--;
        else if (!depth && char === ";") {
            if (declaration.trim()) declarations.push(declaration.trim());
            declaration = "";
            continue;
        }
        declaration += char;
    }
    if (declaration.trim()) declarations.push(declaration.trim());
    return declarations;
}

function styleText(node) {
    if (node.type === "Literal" && typeof node.value === "string") return node.value;
    // Mark interpolation positions without treating dynamic values as CSS declaration names.
    if (node.type === "TemplateLiteral") return node.quasis.map((part) => part.value.cooked).join("\0");
    if (node.type === "BinaryExpression" && node.operator === "+") {
        return (styleText(node.left) ?? "\0") + (styleText(node.right) ?? "\0");
    }
    return null;
}

export default {
    meta: {
        type: "suggestion",
        schema: [],
        messages: {
            static: 'Move inline CSS "{{property}}" into a stylesheet; pass dynamic values through CSS custom properties.',
            opaque: "Use an inline CSS custom-property string or template so its declarations can be checked.",
        },
    },
    create(context) {
        const report = (node, property) =>
            context.report({ node, messageId: property ? "static" : "opaque", data: { property } });

        const inspect = (node) => {
            if (!node || (node.type === "Literal" && !node.value)) return;
            if (node.type === "ConditionalExpression") {
                inspect(node.consequent);
                inspect(node.alternate);
                return;
            }
            if (node.type === "LogicalExpression") {
                if (node.operator !== "&&") inspect(node.left);
                inspect(node.right);
                return;
            }
            if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
                if (node.body.type === "BlockStatement") inspectReturns(node.body);
                else inspect(node.body);
                return;
            }
            const text = styleText(node);
            if (text === null) return report(node);
            for (const declaration of splitDeclarations(text)) {
                const separator = declaration.indexOf(":");
                if (separator < 0) {
                    report(node);
                    continue;
                }
                const property = declaration.slice(0, separator).trim();
                const value = declaration.slice(separator + 1);
                if (property.startsWith("--") && !property.includes("\0")) continue;
                if (["top", "left", "right", "bottom"].includes(property) && value.includes("\0")) continue;
                report(node, property);
            }
        };

        const inspectReturns = (node) => {
            if (!node) return;
            if (node.type === "ReturnStatement") return inspect(node.argument);
            if (/Function/.test(node.type)) return;
            for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
                const child = node[key];
                if (Array.isArray(child)) child.forEach(inspectReturns);
                else if (child) inspectReturns(child);
            }
        };

        return {
            Property(node) {
                // shortcut: checks object style attributes; imperative DOM style updates require review.
                if (node.parent.type !== "ObjectExpression") return;
                const name = node.key.type === "Literal" ? node.key.value : !node.computed && node.key.name;
                if (name === "style") inspect(node.value);
            },
        };
    },
};
