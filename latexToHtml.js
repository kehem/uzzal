/**
 * Converts LaTeX code to HTML for previewing research proposals.
 * Supports document structure, lists, tables, references, math, figures, and common inline commands.
 * Handles packages: geometry, amsmath, amssymb, natbib, hyperref, xcolor, booktabs, setspace.
 * @param {string} latex - The LaTeX code to convert.
 * @returns {string} - The generated HTML string or an error message.
 */
function parseLatexToHtml(latex) {
    try {
        let html = '';
        const lines = latex.split('\n').map(line => line.trim()).filter(line => line);
        let inAbstract = false;
        let inSection = false;
        let inTable = false;
        let inReferences = false;
        let inItemize = false;
        let inEnumerate = false;
        let inEquation = false;
        let inFigure = false;
        let inTitlePage = false;
        let currentSection = '';
        let tableRows = [];
        let listItems = [];
        let titlePageContent = [];
        let tableColumnCount = 0; // Track expected number of columns

        /**
         * Processes inline LaTeX commands (e.g., \textbf, \textit, \citep, math).
         * @param {string} text - The text containing LaTeX commands.
         * @returns {string} - The processed text with HTML tags.
         */
        function processInlineCommands(text) {
            // Handle \textbf{text}
            text = text.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>');
            // Handle \textit{text}
            text = text.replace(/\\textit\{([^}]+)\}/g, '<em>$1</em>');
            // Handle \emph{text}
            text = text.replace(/\\emph\{([^}]+)\}/g, '<em>$1</em>');
            // Handle \underline{text}
            text = text.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
            // Handle \texttt{text}
            text = text.replace(/\\texttt\{([^}]+)\}/g, '<code style="font-family: monospace;">$1</code>');
            // Handle \textsuperscript{text}
            text = text.replace(/\\textsuperscript\{([^}]+)\}/g, '<sup>$1</sup>');
            // Handle \textsubscript{text}
            text = text.replace(/\\textsubscript\{([^}]+)\}/g, '<sub>$1</sub>');
            // Handle citations \cite{key}, \citep{key}
            text = text.replace(/\\cite(p)?\{([^}]+)\}/g, '<a href="#$2" style="color: #0000FF;">[$2]</a>');
            // Handle \url{address}
            text = text.replace(/\\url\{([^}]+)\}/g, '<a href="$1" style="color: #000099;">$1</a>');
            // Handle \href{url}{text}
            text = text.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '<a href="$1" style="color: #000099;">$2</a>');
            // Handle basic inline math \( ... \) or $ ... $
            text = text.replace(/\\\((.*?[^\\])\\\)/g, '<span class="math-inline">$1</span>');
            text = text.replace(/\$(.*?[^\\])\$/g, '<span class="math-inline">$1</span>');
            // Handle amsmath/amssymb symbols
            text = text.replace(/\\alpha/g, 'α');
            text = text.replace(/\\beta/g, 'β');
            text = text.replace(/\\gamma/g, 'γ');
            text = text.replace(/\\delta/g, 'δ');
            text = text.replace(/\\sum/g, '∑');
            text = text.replace(/\\int/g, '∫');
            text = text.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
            // Handle booktabs (no visual effect in HTML, but clean up)
            text = text.replace(/\\(toprule|midrule|bottomrule)/g, '');
            // Handle setspace (no direct HTML equivalent, ignored for preview)
            text = text.replace(/\\(onehalfspacing|doublespacing|singlespacing)/g, '');
            // Handle xcolor (basic color support)
            text = text.replace(/\\color\{([^}]+)\}\{([^}]+)\}/g, '<span style="color: $1;">$2</span>');
            // Remove table formatting like {@{}lr@{}}
            text = text.replace(/\{@\{\}[^}]*@\{\}\}/g, '');
            // Remove other LaTeX commands (basic cleanup)
            text = text.replace(/\\[a-zA-Z]+(\{[^}]*\})?/g, '');
            // Escape HTML characters to prevent injection
            text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return text.trim();
        }

        /**
         * Parses a LaTeX table row into cells, handling escaped & and row termination.
         * @param {string} line - The LaTeX table row.
         * @returns {string[]|null} - Array of cell contents or null if not a valid row.
         */
        function parseTableRow(line) {
            if (line.match(/^\\(hline|toprule|midrule|bottomrule|centering|\\)/)) return null;
            if (!line.includes('&') && !line.endsWith('\\\\')) return null;

            const cells = [];
            let currentCell = '';
            let inBraces = 0;
            let i = 0;

            while (i < line.length) {
                const char = line[i];
                if (char === '{' && (i === 0 || line[i - 1] !== '\\')) {
                    inBraces++;
                    currentCell += char;
                } else if (char === '}' && (i === 0 || line[i - 1] !== '\\')) {
                    inBraces--;
                    currentCell += char;
                } else if (char === '&' && inBraces === 0 && (i === 0 || line[i - 1] !== '\\')) {
                    cells.push(processInlineCommands(currentCell.trim()));
                    currentCell = '';
                } else if (line.startsWith('\\\\', i) && inBraces === 0) {
                    cells.push(processInlineCommands(currentCell.trim()));
                    return cells;
                } else {
                    currentCell += char;
                }
                i++;
            }

            // Handle case where row doesn't end with \\ but is last in table
            if (currentCell.trim() && inBraces === 0) {
                cells.push(processInlineCommands(currentCell.trim()));
            }
            return cells.length > 0 ? cells : null;
        }

        // Process each line of LaTeX
        for (const line of lines) {
            // Extract title
            if (line.match(/^\\title\{(.+?)\}/)) {
                const title = line.match(/^\\title\{(.+?)\}/)[1];
                titlePageContent.push(`<h1 style="font-size: 1.8rem; font-weight: bold; text-align: center; margin-bottom: 1.5rem;">${processInlineCommands(title)}</h1>`);
            }
            // Extract author
            else if (line.match(/^\\author\{(.+?)\}/)) {
                const author = line.match(/^\\author\{(.+?)\}/)[1];
                titlePageContent.push(`<p style="text-align: center; font-size: 1.2rem; margin-bottom: 1rem;">${processInlineCommands(author)}</p>`);
            }
            // Extract date
            else if (line.match(/^\\date\{(.+?)\}/)) {
                const date = line.match(/^\\date\{(.+?)\}/)[1];
                titlePageContent.push(`<p style="text-align: center; font-size: 1.2rem; margin-bottom: 1.5rem;">${processInlineCommands(date)}</p>`);
            }
            // Handle \maketitle
            else if (line.match(/^\\maketitle/)) {
                inTitlePage = true;
                html += `<div style="text-align: center; margin-bottom: 2rem;">${titlePageContent.join('')}</div>`;
                titlePageContent = [];
            }
            // Extract abstract
            else if (line.match(/^\\begin\{abstract\}/)) {
                inAbstract = true;
                html += `<div class="abstract" style="font-style: italic; margin-bottom: 1.5rem;"><strong>Abstract:</strong> `;
            }
            else if (line.match(/^\\end\{abstract\}/)) {
                inAbstract = false;
                html += `</div>`;
            }
            // Extract sections
            else if (line.match(/^\\section\{(.+?)\}/)) {
                if (inSection) html += `</div>`;
                if (inTable) {
                    html += renderTable(tableRows);
                    inTable = false;
                    tableRows = [];
                    tableColumnCount = 0;
                }
                if (inReferences) {
                    html += `</ul></div>`;
                    inReferences = false;
                }
                if (inItemize || inEnumerate) {
                    html += renderList(listItems, inItemize ? 'ul' : 'ol');
                    inItemize = false;
                    inEnumerate = false;
                    listItems = [];
                }
                currentSection = line.match(/^\\section\{(.+?)\}/)[1];
                inSection = true;
                html += `<h2 style="font-size: 1.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">${processInlineCommands(currentSection)}</h2><div>`;
            }
            // Extract starred sections (e.g., References)
            else if (line.match(/^\\section\*\{(.+?)\}/)) {
                if (inSection) html += `</div>`;
                if (inTable) {
                    html += renderTable(tableRows);
                    inTable = false;
                    tableRows = [];
                    tableColumnCount = 0;
                }
                if (inReferences) {
                    html += `</ul></div>`;
                    inReferences = false;
                }
                if (inItemize || inEnumerate) {
                    html += renderList(listItems, inItemize ? 'ul' : 'ol');
                    inItemize = false;
                    inEnumerate = false;
                    listItems = [];
                }
                currentSection = line.match(/^\\section\*\{(.+?)\}/)[1];
                inSection = true;
                if (currentSection.toLowerCase() === 'references') {
                    inReferences = true;
                    html += `<h2 style="font-size: 1.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">References</h2><div class="references"><ul style="margin-top: 0.5rem;">`;
                } else {
                    html += `<h2 style="font-size: 1.4rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 0.5rem;">${processInlineCommands(currentSection)}</h2><div>`;
                }
            }
            // Extract subsections
            else if (line.match(/^\\subsection\{(.+?)\}/)) {
                const subsection = line.match(/^\\subsection\{(.+?)\}/)[1];
                html += `<h3 style="font-size: 1.2rem; font-weight: bold; margin-top: 1rem; margin-bottom: 0.5rem;">${processInlineCommands(subsection)}</h3>`;
            }
            // Extract table environment
            else if (line.match(/^\\begin\{table\}/)) {
                inTable = true;
                tableRows = [];
                tableColumnCount = 0;
            }
            else if (line.match(/^\\end\{table\}/)) {
                inTable = false;
                html += renderTable(tableRows);
                tableRows = [];
                tableColumnCount = 0;
            }
            // Extract tabular environment and column specification
            else if (line.match(/^\\begin\{tabular\}\{([^{}]+)\}/)) {
                inTable = true;
                tableRows = [];
                const cols = line.match(/^\\begin\{tabular\}\{([^{}]+)\}/)[1];
                // Count columns (e.g., {lcr} -> 3 columns)
                tableColumnCount = cols.replace(/[@{}]/g, '').length;
            }
            else if (line.match(/^\\end\{tabular\}/)) {
                inTable = false;
                // Validate table rows
                const validRows = tableRows.filter(row => row.length === tableColumnCount || tableColumnCount === 0);
                html += renderTable(validRows);
                tableRows = [];
                tableColumnCount = 0;
            }
            // Extract itemize environment
            else if (line.match(/^\\begin\{itemize\}/)) {
                inItemize = true;
                listItems = [];
            }
            else if (line.match(/^\\end\{itemize\}/)) {
                inItemize = false;
                html += renderList(listItems, 'ul');
                listItems = [];
            }
            // Extract enumerate environment
            else if (line.match(/^\\begin\{enumerate\}/)) {
                inEnumerate = true;
                listItems = [];
            }
            else if (line.match(/^\\end\{enumerate\}/)) {
                inEnumerate = false;
                html += renderList(listItems, 'ol');
                listItems = [];
            }
            // Extract equation environment
            else if (line.match(/^\\begin\{equation\}/)) {
                inEquation = true;
                html += `<div class="math-display" style="text-align: center; margin: 1rem 0;">`;
            }
            else if (line.match(/^\\end\{equation\}/)) {
                inEquation = false;
                html += `</div>`;
            }
            // Extract figure environment
            else if (line.match(/^\\begin\{figure\}/)) {
                inFigure = true;
                html += `<div class="figure" style="text-align: center; margin: 1.5rem 0;">`;
            }
            else if (line.match(/^\\end\{figure\}/)) {
                inFigure = false;
                html += `</div>`;
            }
            // Handle reference items
            else if (inReferences && line.match(/^\\bibitem/)) {
                const refText = processInlineCommands(line.replace(/^\\bibitem\[?.*?\]?\{[^}]*\}/, '').trim());
                html += `<li style="margin-bottom: 0.5rem;">${refText}</li>`;
            }
            // Handle list items
            else if ((inItemize || inEnumerate) && line.match(/^\\item/)) {
                const itemText = processInlineCommands(line.replace(/^\\item\s*/, '').trim());
                if (itemText) listItems.push(itemText);
            }
            // Handle table rows
            else if (inTable) {
                const row = parseTableRow(line);
                if (row) {
                    // Pad or truncate row to match expected column count
                    if (tableColumnCount > 0) {
                        while (row.length < tableColumnCount) row.push('');
                        if (row.length > tableColumnCount) row.length = tableColumnCount;
                    }
                    tableRows.push(row);
                }
            }
            // Handle equation content
            else if (inEquation) {
                const mathText = processInlineCommands(line);
                if (mathText) html += `<span class="math-display-content">${mathText}</span>`;
            }
            // Handle figure caption
            else if (inFigure && line.match(/^\\caption\{(.+?)\}/)) {
                const caption = line.match(/^\\caption\{(.+?)\}/)[1];
                html += `<figcaption style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">${processInlineCommands(caption)}</figcaption>`;
            }
            // Extract text content
            else if (!line.match(/^\\(documentclass|usepackage|begin\{document\}|end\{document\}|maketitle|titlepage|begin\{titlepage\}|end\{titlepage\}|nocite|bibliographystyle|bibliography|toprule|midrule|bottomrule|onehalfspacing|centering)/)) {
                if (inAbstract || inSection) {
                    let text = processInlineCommands(line);
                    if (text) html += `<p style="margin-bottom: 1rem;">${text}</p>`;
                }
            }
        }

        // Close any open environments
        if (inTable) {
            const validRows = tableRows.filter(row => row.length === tableColumnCount || tableColumnCount === 0);
            html += renderTable(validRows);
        }
        if (inReferences) html += `</ul></div>`;
        if (inSection) html += `</div>`;
        if (inItemize || inEnumerate) html += renderList(listItems, inItemize ? 'ul' : 'ol');
        if (inEquation) html += `</div>`;
        if (inFigure) html += `</div>`;
        if (inTitlePage) html += `</div>`;

        // Return default message if no content is parsed
        return html || '<p>No previewable content found. Please copy the LaTeX code and compile it in <a href="https://www.overleaf.com" target="_blank" class="text-blue-600 hover:underline">Overleaf</a>.</p>';
    } catch (error) {
        return `<p style="color: #e53e3e; text-align: center; font-size: 1rem; margin-top: 1rem;">Error parsing LaTeX: ${error.message}. Please copy the LaTeX code and compile it in <a href="https://www.overleaf.com" target="_blank" class="text-blue-600 hover:underline">Overleaf</a>.</p>`;
    }
}

/**
 * Renders a LaTeX table as an HTML table with booktabs styling.
 * @param {string[][]} rows - Array of table rows, where each row is an array of cells.
 * @returns {string} - The HTML table string.
 */
function renderTable(rows) {
    if (!rows.length) return '';
    let tableHtml = '<table style="width: 100%; border-collapse: collapse; margin: 1rem 0;"><tbody>';
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        tableHtml += '<tr>';
        for (const cell of row) {
            const tag = i === 0 ? 'th' : 'td';
            const style = i === 0 ? 'border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left; font-weight: bold; background-color: #f7fafc;' : 'border: 1px solid #e2e8f0; padding: 0.5rem; text-align: left;';
            tableHtml += `<${tag} style="${style}">${cell || '&nbsp;'}</${tag}>`;
        }
        tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    return tableHtml;
}

/**
 * Renders a list (itemize or enumerate) as an HTML list.
 * @param {string[]} items - Array of list items.
 * @param {string} type - 'ul' for itemize, 'ol' for enumerate.
 * @returns {string} - The HTML list string.
 */
function renderList(items, type) {
    if (!items.length) return '';
    const listType = type === 'ul' ? 'ul' : 'ol';
    let listHtml = `<${listType} style="margin-left: 2rem; margin-bottom: 1rem;">`;
    for (const item of items) {
        listHtml += `<li>${item}</li>`;
    }
    listHtml += `</${listType}>`;
    return listHtml;
}

/**
 * Applies CSS styles to the generated HTML content for consistent preview rendering.
 * Matches the styling of the provided HTML interface.
 * @param {string} html - The HTML content to style.
 * @returns {string} - The styled HTML content wrapped in a container.
 */
function applyPreviewStyles(html) {
    return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.5; text-align: justify; max-width: 800px; margin: 0 auto; padding: 2rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); max-height: 600px; overflow-y: auto;">
            ${html}
        </div>
    `;
}

// Export the main function for use in other scripts
export { parseLatexToHtml, applyPreviewStyles };
