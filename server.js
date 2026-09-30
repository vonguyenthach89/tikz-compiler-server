const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Tùy chọn bảo mật: Đặt Secret Key để tránh bị người ngoài xài chùa API
const API_SECRET_KEY = process.env.API_SECRET_KEY || "MySuperSecretKey123";

app.post('/compile-tikz', (req, res) => {
  const { tikzCode, apiKey } = req.body;

  // Kiểm tra Key bảo mật
  if (apiKey !== API_SECRET_KEY) {
    return res.status(401).json({ success: false, error: "Unauthorized: Key không hợp lệ" });
  }

  if (!tikzCode) {
    return res.status(400).json({ success: false, error: "Thiếu mã tikzCode" });
  }

  const jobFolder = path.join(__dirname, 'temp');
  if (!fs.existsSync(jobFolder)) fs.mkdirSync(jobFolder);

  const fileId = crypto.randomBytes(8).toString('hex');
  const texPath = path.join(jobFolder, `${fileId}.tex`);
  const dNodePath = path.join(jobFolder, `${fileId}.dvi`);
  const svgPath = path.join(jobFolder, `${fileId}.svg`);

  // Bọc mã TikZ vào document LaTeX chuẩn
  const fullLatexCode = `
\\documentclass[tikz,border=2pt]{standalone}
\\usepackage[utf8]{vietnam}
\\usepackage{amsmath,amssymb}
\\usepackage{tikz,tkz-tab,tkz-euclide}
\\usetikzlibrary{shapes,arrows,calc,intersections,angles,quotes}
\\begin{document}
${tikzCode}
\\end{document}
  `;

  fs.writeFileSync(texPath, fullLatexCode, 'utf8');

  // Lệnh biên dịch LaTeX -> DVI -> SVG
  const compileCmd = `pdflatex -interaction=batchmode -output-format=dvi -output-directory="${jobFolder}" "${texPath}" && dvisvgm --no-fonts "${dNodePath}" -o "${svgPath}"`;

  exec(compileCmd, { timeout: 15000 }, (error, stdout, stderr) => {
    let svgData = null;
    let isSuccess = false;
    let errMsg = "";

    if (fs.existsSync(svgPath)) {
      svgData = fs.readFileSync(svgPath, 'utf8');
      isSuccess = true;
    } else {
      errMsg = "Lỗi biên dịch LaTeX/TikZ. Kiểm tra cú pháp.";
    }

    // Dọn dẹp tất cả các file rác sinh ra trong quá trình build
    const extensions = ['.tex', '.dvi', '.log', '.aux', '.svg'];
    extensions.forEach(ext => {
      const p = path.join(jobFolder, `${fileId}${ext}`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    });

    if (isSuccess) {
      return res.json({ success: true, svg: svgData });
    } else {
      return res.status(500).json({ success: false, error: errMsg });
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TikZ Server đang chạy ở port ${PORT}`);
});
