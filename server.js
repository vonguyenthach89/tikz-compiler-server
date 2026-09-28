const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Trang chủ kiểm tra trạng thái Server (GET /)
app.get('/', (req, res) => {
    res.send('<h1>TikZ Compiler Server đang hoạt động tốt!</h1><p>Gửi POST request tới <code>/compile</code> để biên dịch TikZ.</p>');
});

// Endpoint biên dịch mã TikZ (POST /compile)
app.post('/compile', (req, res) => {
    const { tikzCode } = req.body;
    if (!tikzCode) return res.status(400).json({ error: 'Thiếu mã TikZ' });

    const id = crypto.randomBytes(8).toString('hex');
    const workDir = path.join(__dirname, 'tmp', id);
    fs.mkdirSync(workDir, { recursive: true });

    const texPath = path.join(workDir, 'document.tex');
    const pdfPath = path.join(workDir, 'document.pdf');
    const svgPath = path.join(workDir, 'document.svg');

    // Bổ sung các định nghĩa lệnh custom (\hoac, \heva) và gói enumitem trong Preamble
    const fullTexDocument = `
\\documentclass[tikz,border=2pt]{standalone}
\\usepackage[utf8]{vietnam}
\\usepackage{amsmath,amssymb,grffile,makecell,fancyhdr,enumerate,arcs,physics,tasks,mathrsfs,graphics,fontawesome}
\\usepackage{enumitem}
\\usepackage{tikz,tkz-tab,tikz-3dplot,tkz-euclide,tabvar,pgfplots,esvect}
\\usepackage{twemojis}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\usetikzlibrary{arrows.meta,calc,intersections,angles,quotes,patterns,through,backgrounds,3d,shapes.geometric,shadings}

% Định nghĩa các lệnh toán học bổ sung
\\newcommand{\\hoac}[1]{\\left[\\begin{aligned}#1\\end{aligned}\\right.}
\\newcommand{\\heva}[1]{\\left\\{\\begin{aligned}#1\\end{aligned}\\right.}

\\begin{document}
${tikzCode}
\\end{document}
`;

    fs.writeFileSync(texPath, fullTexDocument);

    // Biên dịch TEX -> PDF -> SVG
    const cmd = `pdflatex -interaction=nonstopmode -output-directory="${workDir}" "${texPath}" && pdf2svg "${pdfPath}" "${svgPath}"`;

    exec(cmd, (error) => {
        if (fs.existsSync(svgPath)) {
            const svgContent = fs.readFileSync(svgPath, 'utf8');
            fs.rmSync(workDir, { recursive: true, force: true });
            return res.json({ success: true, svg: svgContent });
        } else {
            let logContent = 'Không thể tạo SVG';
            const logPath = path.join(workDir, 'document.log');
            if (fs.existsSync(logPath)) {
                logContent = fs.readFileSync(logPath, 'utf8').substring(0, 1000);
            }
            fs.rmSync(workDir, { recursive: true, force: true });
            return res.status(500).json({ error: 'Lỗi biên dịch LaTeX', log: logContent });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TikZ Server đang chạy trên port ${PORT}`));
