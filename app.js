const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Kullanıcı veritabanı
const USERS_FILE = path.join(__dirname, 'users.json');

// Kullanıcıları yükle
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

// Kullanıcıları kaydet
function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'gizli-anahtar-buraya',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// Oturum kontrolü
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/giris');
    }
    next();
};

// API listesi
const apiList = [
    { id: 'tc-isegiris', name: 'İşe Giriş (TC)', type: 'tc', api: 'tc-isegiris', param: 'tc' },
    { id: 'tc-ikametgah', name: 'İkametgah (TC)', type: 'tc', api: 'tc-ikametgah', param: 'tc' },
    { id: 'tc-ailebirey', name: 'Aile Bireyi (TC)', type: 'tc', api: 'tc-ailebirey', param: 'tc' },
    { id: 'tc-medenicinsiyet', name: 'Medeni Hal/Cinsiyet (TC)', type: 'tc', api: 'tc-medenicinsiyet', param: 'tc' },
    { id: 'tc', name: 'TC Kimlik Sorgu', type: 'tc', api: 'tc', param: 'tc' },
    { id: 'tc2', name: 'TC Sorgu 2', type: 'tc', api: 'tc2', param: 'tc' },
    { id: 'aile', name: 'Aile Bilgisi', type: 'tc', api: 'aile', param: 'tc' },
    { id: 'sulale', name: 'Sülale Bilgisi', type: 'tc', api: 'sulale', param: 'tc' },
    { id: 'hane', name: 'Hane Bilgisi', type: 'tc', api: 'hane', param: 'tc' },
    { id: 'isyeri', name: 'İşyeri Bilgisi', type: 'tc', api: 'isyeri', param: 'tc' },
    { id: 'vesika', name: 'Vesika Bilgisi', type: 'tc', api: 'vesika', param: 'tc' },
    { id: 'isegiris', name: 'İşe Giriş (İsim)', type: 'name', api: 'isegiris', param: 'name-surname' },
    { id: 'ikametgah', name: 'İkametgah (İsim)', type: 'name', api: 'ikametgah', param: 'name-surname' },
    { id: 'ailebirey', name: 'Aile Bireyi (İsim)', type: 'name', api: 'ailebirey', param: 'name-surname' },
    { id: 'medenicinsiyet', name: 'Medeni Hal/Cinsiyet (İsim)', type: 'name', api: 'medenicinsiyet', param: 'name-surname' },
    { id: 'ad', name: 'İsim Sorgu', type: 'name', api: 'ad', param: 'name-surname' },
    { id: 'text', name: 'Text Sorgu', type: 'name', api: 'text', param: 'name-surname' },
    { id: 'raw', name: 'Raw Sorgu', type: 'name', api: 'raw', param: 'name-surname' },
    { id: 'query', name: 'Kapsamlı Sorgu (İl Bazlı)', type: 'city', api: 'query', param: 'city' },
    { id: 'gsm', name: 'GSM Sorgu', type: 'gsm', api: 'gsm', param: 'gsm' },
    { id: 'gsm2', name: 'GSM Sorgu 2', type: 'gsm', api: 'gsm2', param: 'gsm' },
    { id: 'plaka', name: 'Plaka Sorgu', type: 'plaka', api: 'plaka', param: 'plaka' },
    { id: 'test', name: 'Test Endpoint', type: 'test', api: 'test', param: 'none' },
    { id: 'health', name: 'Health Check', type: 'test', api: 'health', param: 'none' }
];

// Ana sayfa
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/giris');
    }
});

// Giriş sayfası
app.get('/giris', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Giriş Yap</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                .container { max-width: 400px; width: 90%; margin: 20px auto; background: white; padding: 40px 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                h2 { text-align: center; color: #333; margin-bottom: 30px; font-size: 28px; }
                input { width: 100%; padding: 14px; margin: 8px 0; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; transition: all 0.3s; }
                input:focus { outline: none; border-color: #667eea; }
                button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin: 15px 0; transition: transform 0.2s; }
                button:hover { transform: translateY(-2px); }
                .link { text-align: center; margin-top: 20px; }
                .link a { color: #667eea; text-decoration: none; font-weight: 500; }
                .error { color: #e74c3c; margin: 10px 0; text-align: center; padding: 10px; background: #fee; border-radius: 8px; }
                .success { color: #27ae60; margin: 10px 0; text-align: center; padding: 10px; background: #e8f5e9; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>🔐 Giriş Yap</h2>
                ${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
                ${req.query.success ? '<div class="success">' + req.query.success + '</div>' : ''}
                <form method="POST" action="/giris">
                    <input type="text" name="username" placeholder="Kullanıcı Adı" required>
                    <input type="password" name="password" placeholder="Şifre" required>
                    <button type="submit">Giriş Yap</button>
                </form>
                <div class="link">
                    Hesabın yok mu? <a href="/kayit">Kayıt Ol</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Kayıt sayfası
app.get('/kayit', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Kayıt Ol</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
                .container { max-width: 400px; width: 90%; margin: 20px auto; background: white; padding: 40px 30px; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
                h2 { text-align: center; color: #333; margin-bottom: 30px; font-size: 28px; }
                input { width: 100%; padding: 14px; margin: 8px 0; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; transition: all 0.3s; }
                input:focus { outline: none; border-color: #667eea; }
                button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; margin: 15px 0; transition: transform 0.2s; }
                button:hover { transform: translateY(-2px); }
                .link { text-align: center; margin-top: 20px; }
                .link a { color: #667eea; text-decoration: none; font-weight: 500; }
                .error { color: #e74c3c; margin: 10px 0; text-align: center; padding: 10px; background: #fee; border-radius: 8px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>📝 Kayıt Ol</h2>
                ${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
                <form method="POST" action="/kayit">
                    <input type="text" name="username" placeholder="Kullanıcı Adı" required>
                    <input type="password" name="password" placeholder="Şifre" required>
                    <input type="password" name="confirm" placeholder="Şifre Tekrar" required>
                    <button type="submit">Kayıt Ol</button>
                </form>
                <div class="link">
                    Zaten hesabın var mı? <a href="/giris">Giriş Yap</a>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Kayıt işlemi
app.post('/kayit', async (req, res) => {
    const { username, password, confirm } = req.body;
    
    if (!username || !password) {
        return res.redirect('/kayit?error=Kullanıcı adı ve şifre gerekli');
    }
    
    if (password !== confirm) {
        return res.redirect('/kayit?error=Şifreler eşleşmiyor');
    }
    
    if (password.length < 4) {
        return res.redirect('/kayit?error=Şifre en az 4 karakter olmalı');
    }
    
    if (users[username]) {
        return res.redirect('/kayit?error=Bu kullanıcı adı zaten var');
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword, createdAt: new Date().toISOString() };
    saveUsers();
    
    res.redirect('/giris?success=Kayıt başarılı, giriş yapabilirsiniz');
});

// Giriş işlemi
app.post('/giris', async (req, res) => {
    const { username, password } = req.body;
    
    const user = users[username];
    if (!user) {
        return res.redirect('/giris?error=Kullanıcı bulunamadı');
    }
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        return res.redirect('/giris?error=Hatalı şifre');
    }
    
    req.session.userId = username;
    res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
    const tcApis = apiList.filter(api => api.type === 'tc');
    const nameApis = apiList.filter(api => api.type === 'name');
    const cityApis = apiList.filter(api => api.type === 'city');
    const gsmApis = apiList.filter(api => api.type === 'gsm');
    const plakaApis = apiList.filter(api => api.type === 'plaka');
    const testApis = apiList.filter(api => api.type === 'test');
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ana Sayfa</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
                .header { background: white; padding: 30px; border-radius: 20px; margin-bottom: 30px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.1); position: relative; }
                h1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-size: 2.5em; margin: 0; }
                .subtitle { color: #666; margin-top: 10px; }
                .logout { position: absolute; top: 20px; right: 20px; background: #e74c3c; color: white; padding: 8px 16px; text-decoration: none; border-radius: 8px; font-size: 14px; transition: background 0.3s; }
                .logout:hover { background: #c0392b; }
                .section { background: white; border-radius: 20px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .section h2 { color: #333; margin-bottom: 15px; font-size: 1.3em; border-left: 4px solid #667eea; padding-left: 12px; }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; }
                .api-btn { background: #f8f9fa; border: none; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 600; color: #333; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.05); transition: all 0.2s; text-align: center; }
                .api-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); background: #e9ecef; }
                .api-btn.tc { border-top: 3px solid #28a745; }
                .api-btn.name { border-top: 3px solid #007bff; }
                .api-btn.city { border-top: 3px solid #fd7e14; background: #fff3e0; }
                .api-btn.gsm { border-top: 3px solid #ffc107; }
                .api-btn.plaka { border-top: 3px solid #dc3545; }
                .api-btn.test { border-top: 3px solid #6c757d; }
                @media (max-width: 600px) {
                    h1 { font-size: 1.8em; }
                    .grid { grid-template-columns: repeat(2, 1fr); }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <a href="/cikis" class="logout">Çıkış</a>
                <h1>/SEVEMEZSİNİZ</h1>
                <div class="subtitle">Hoşgeldin, ${req.session.userId}</div>
            </div>
            
            <div class="section">
                <h2>📇 TC Kimlik Sorguları</h2>
                <div class="grid">
                    ${tcApis.map(api => `<button class="api-btn tc" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
                </div>
            </div>
            
            <div class="section">
                <h2>👤 İsim Sorguları</h2>
                <div class="grid">
                    ${nameApis.map(api => `<button class="api-btn name" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
                </div>
            </div>
            
            <div class="section">
                <h2>📍 Kapsamlı Sorgu (İl Bazlı)</h2>
                <div class="grid">
                    ${cityApis.map(api => `<button class="api-btn city" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
                </div>
            </div>
            
            <div class="section">
                <h2>📱 GSM Sorguları</h2>
                <div class="grid">
                    ${gsmApis.map(api => `<button class="api-btn gsm" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
                </div>
            </div>
            
            <div class="section">
                <h2>🚗 Plaka Sorguları</h2>
                <div class="grid">
                    ${plakaApis.map(api => `<button class="api-btn plaka" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
                </div>
            </div>
            
            <div class="section">
                <h2>🔧 Test Endpointleri</h2>
                <div class="grid">
                    ${testApis.map(api => `<button class="api-btn test" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
                </div>
            </div>
        </body>
        </html>
    `);
});

// Sorgu sayfaları
apiList.forEach(api => {
    app.get(`/sorgu/${api.id}`, requireLogin, (req, res) => {
        if (api.type === 'city') {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${api.name}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; }
                        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
                        .container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                        .back { display: inline-block; margin-bottom: 20px; color: #667eea; text-decoration: none; font-weight: 500; }
                        h2 { color: #333; margin-bottom: 10px; }
                        .desc { color: #666; margin-bottom: 25px; font-size: 14px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
                        .form-group { margin-bottom: 20px; }
                        label { display: block; margin-bottom: 8px; color: #555; font-weight: 500; }
                        input { width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 12px; font-size: 16px; transition: all 0.3s; }
                        input:focus { outline: none; border-color: #667eea; }
                        button { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 14px 30px; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; width: 100%; transition: transform 0.2s; }
                        button:hover { transform: translateY(-2px); }
                        .result-box { margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 12px; border-left: 4px solid #fd7e14; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px; display: none; max-height: 500px; overflow: auto; }
                        .loading { display: none; text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; }
                        .loading:after { content: '...'; animation: dots 1.5s steps(5, end) infinite; }
                        @keyframes dots { 0%, 20% { content: '.'; } 40% { content: '..'; } 60% { content: '...'; } 80%, 100% { content: ''; } }
                        .error-box { margin-top: 20px; padding: 15px; background: #fee; border-radius: 12px; border-left: 4px solid #e74c3c; color: #c0392b; display: none; }
                        .info { background: #e3f2fd; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #1976d2; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <a href="/dashboard" class="back">← Ana Sayfa</a>
                        <h2>📍 ${api.name}</h2>
                        <div class="desc">İl bazlı kapsamlı kişi sorgulama. Girilen ilde yaşayan kişilerin bilgilerini getirir.</div>
                        <div class="info">💡 Örnek: "Adana", "İstanbul", "Ankara" gibi il adlarını yazabilirsiniz.</div>
                        
                        <form id="sorguForm" onsubmit="sorgula(event)">
                            <div class="form-group">
                                <label>🏙️ İl Adı:</label>
                                <input type="text" id="city" placeholder="Örnek: Adana, İstanbul, Ankara" required>
                            </div>
                            <div class="form-group">
                                <label>👤 İsim (Opsiyonel):</label>
                                <input type="text" id="name" placeholder="Belirli bir ismi filtrelemek için yazın (opsiyonel)">
                            </div>
                            <button type="submit">🔍 Kapsamlı Sorgula</button>
                        </form>
                        
                        <div id="loading" class="loading">Sorgulanıyor</div>
                        <div id="resultBox" class="result-box"></div>
                        <div id="errorBox" class="error-box"></div>
                    </div>
                    <script>
                        async function sorgula(event) {
                            event.preventDefault();
                            const loading = document.getElementById('loading');
                            const resultBox = document.getElementById('resultBox');
                            const errorBox 
