const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Khóa bảo mật (Thầy có thể đổi chuỗi này theo ý muốn)
const API_SECRET_KEY = process.env.API_SECRET_KEY || "MySuperSecretKey123";

// Trang chủ kiểm tra trạng thái Server (GET /)
app.get('/', (req, res) => {
    res.send('<h1>TikZ Compiler Server đang hoạt động tốt!</h1><p>Gửi POST request tới <code>/compile</code> để biên dịch TikZ.</p>');
});

// Endpoint biên dịch mã TikZ (POST /compile)
app.post('/compile', (req, res) => {
    const { tikzCode, apiKey } = req.body;

    // 1. Kiểm tra khóa bảo mật (Nếu có cài đặt)
    if (apiKey && apiKey !== API_SECRET_KEY) {
        return res.status(401).json({ error: 'Unauthorized: API Key không hợp lệ' });
    }

    if (!tikzCode) return res.status(400).json({ error: 'Thiếu mã TikZ' });

    const id = crypto.randomBytes(8).toString('hex');
    const workDir = path.join(__dirname, 'tmp', id);
    fs.mkdirSync(workDir, { recursive: true });

    const texPath = path.join(workDir, 'document.tex');
    const pdfPath = path.join(workDir, 'document.pdf');
    const svgPath = path.join(workDir, 'document.svg');

    // 2. Preamble LaTeX đầy đủ cho chương trình Phổ thông (Bảng biến thiên, Hình học 3D, Đồ thị)
    const fullTexDocument = `
\\documentclass[tikz,border=2pt]{standalone}
\\usepackage[utf8]{vietnam}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{enumitem}
\\usepackage{tikz}
\\usepackage{tkz-tab}
\\usepackage{tkz-euclide}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\usetikzlibrary{arrows.meta,calc,intersections,angles,quotes,patterns,through,backgrounds,3d,perspective}

% Định nghĩa các lệnh toán học bổ sung thường dùng trong đề thi
\\newcommand{\\hoac}[1]{\\left[\\begin{aligned}#1\\end{aligned}\\right.}
\\newcommand{\\heva}[1]{\\left\\{\\begin{aligned}#1\\end{aligned}\\right.}
\\newcommand{\\True}{\\textbf{True}} % Tương thích gói ex-test

\\begin{document}
${tikzCode}
\\end{document}
`;

    fs.writeFileSync(texPath, fullTexDocument, 'utf8');

    // 3. Lệnh biên dịch TEX -> PDF -> SVG
    const cmd = `pdflatex -interaction=nonstopmode -output-directory="${workDir}" "${texPath}" && pdf2svg "${pdfPath}" "${svgPath}"`;

    // 4. Bổ sung timeout 15 giây chống treo Server
    exec(cmd, { timeout: 15000 }, (error) => {
        if (fs.existsSync(svgPath)) {
            const svgContent = fs.readFileSync(svgPath, 'utf8');
            // Dọn dẹp thư mục tạm
            fs.rmSync(workDir, { recursive: true, force: true });
            return res.json({ success: true, svg: svgContent });
        } else {
            let logContent = 'Không thể tạo SVG do lỗi biên dịch LaTeX.';
            const logPath = path.join(workDir, 'document.log');
            if (fs.existsSync(logPath)) {
                // Lấy 1200 ký tự cuối của file log để xem nguyên nhân lỗi cụ thể
                const fullLog = fs.readFileSync(logPath, 'utf8');
                logContent = fullLog.substring(Math.max(0, fullLog.length - 1200));
            }
            // Dọn dẹp thư mục tạm
            fs.rmSync(workDir, { recursive: true, force: true });
            return res.status(500).json({ error: 'Lỗi biên dịch LaTeX', log: logContent });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TikZ Server đang chạy trên port ${PORT}`));
