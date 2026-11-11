import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const deployDir = path.join(rootDir, 'deploy');

console.log('--- Step 1: Building @nyopasta/shared ---');
execSync('npm run build:shared', { stdio: 'inherit', cwd: rootDir });

console.log('\n--- Step 2: Building Customer PWA (base: /nyopasta/customer/) ---');
execSync('npx vite build --base=/nyopasta/customer/', {
  stdio: 'inherit',
  cwd: path.join(rootDir, 'apps/customer'),
});

console.log('\n--- Step 3: Building Admin PWA (base: /nyopasta/admin/) ---');
execSync('npx vite build --base=/nyopasta/admin/', {
  stdio: 'inherit',
  cwd: path.join(rootDir, 'apps/admin'),
});

console.log('\n--- Step 4: Assembling deploy/ directory ---');
if (fs.existsSync(deployDir)) {
  fs.rmSync(deployDir, { recursive: true, force: true });
}
fs.mkdirSync(deployDir, { recursive: true });

// Copy customer build
const customerDest = path.join(deployDir, 'customer');
fs.cpSync(path.join(rootDir, 'apps/customer/dist'), customerDest, { recursive: true });

// Copy admin build
const adminDest = path.join(deployDir, 'admin');
fs.cpSync(path.join(rootDir, 'apps/admin/dist'), adminDest, { recursive: true });

// GitHub Pages .nojekyll
fs.writeFileSync(path.join(deployDir, '.nojekyll'), '');

// Portal index.html
const portalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>NYO Pasta Apps Portal</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #FAF4E8; color: #172554; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; }
    .card { background: white; border-radius: 24px; padding: 32px 24px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(226, 88, 62, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05); text-align: center; border: 1px solid #EFE7D5; }
    .logo { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; border: 3px solid #E2583E; margin: 0 auto 16px; display: block; }
    h1 { font-size: 24px; font-weight: 800; color: #E2583E; letter-spacing: -0.5px; margin-bottom: 4px; }
    .subtitle { font-size: 13px; color: #6B7280; margin-bottom: 24px; font-weight: 500; }
    .btn-group { display: flex; flex-direction: column; gap: 14px; }
    .app-btn { display: flex; align-items: center; justify-content: space-between; text-decoration: none; padding: 18px 20px; border-radius: 16px; font-weight: 700; font-size: 15px; transition: transform 0.15s ease, box-shadow 0.15s ease; border: 2px solid transparent; }
    .app-btn:active { transform: scale(0.98); }
    .btn-customer { background: #E2583E; color: white; box-shadow: 0 4px 14px rgba(226, 88, 62, 0.35); }
    .btn-customer:hover { background: #CE452C; }
    .btn-admin { background: #172554; color: white; box-shadow: 0 4px 14px rgba(23, 37, 84, 0.3); }
    .btn-admin:hover { background: #0F172A; }
    .badge { font-size: 11px; font-weight: 600; padding: 4px 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.2); }
    .info { margin-top: 24px; font-size: 12px; color: #9CA3AF; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/nyopasta/customer/logo.jpg" alt="NYO Pasta Logo" class="logo" />
    <h1>NYO PASTA</h1>
    <p class="subtitle">Not Your Ordinary Pasta · Toa Payoh Palm Spring #01-54</p>
    
    <div class="btn-group">
      <a href="/nyopasta/customer/" class="app-btn btn-customer">
        <div style="text-align: left;">
          <div>Customer Ordering PWA</div>
          <div style="font-size: 11px; opacity: 0.85; font-weight: 400; margin-top: 2px;">Menu, Dine-in/Takeaway & Virtual Loyalty Card</div>
        </div>
        <span class="badge">Open →</span>
      </a>

      <a href="/nyopasta/admin/" class="app-btn btn-admin">
        <div style="text-align: left;">
          <div>Kitchen & Admin PWA</div>
          <div style="font-size: 11px; opacity: 0.85; font-weight: 400; margin-top: 2px;">Live Orders, 1-Tap Sold Out & Schedule</div>
        </div>
        <span class="badge">Open →</span>
      </a>
    </div>

    <p class="info">
      Designed for mobile installation. Tap either application and add to Home Screen for standalone fullscreen experience.
    </p>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(deployDir, 'index.html'), portalHtml);
console.log('\ndeploy/ assembled successfully!');
