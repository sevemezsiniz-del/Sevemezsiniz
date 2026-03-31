const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const USERS_FILE = path.join(__dirname, 'users.json');
let users = {};
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'gizli-anahtar-buraya',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/giris');
    }
    next();
};

const apiList = [
    { id: 'tc-isegiris', name: 'İşe Giriş (TC)', type: 'tc', api: 'tc-isegiris' },
    { id: 'tc-ikametgah', name: 'İkametgah (TC)', type: 'tc', api: 'tc-ikametgah' },
    { id: 'tc-ailebirey', name: 'Aile Bireyi (TC)', type: 'tc', api: 'tc-ailebirey' },
    { id: 'tc-medenicinsiyet', name: 'Medeni Hal/Cinsiyet (TC)', type: 'tc', api: 'tc-medenicinsiyet' },
    { id: 'tc', name: 'TC Kimlik Sorgu', type: 'tc', api: 'tc' },
    { id: 'tc2', name: 'TC Sorgu 2', type: 'tc', api: 'tc2' },
    { id: 'aile', name: 'Aile Bilgisi', type: 'tc', api: 'aile' },
    { id: 'sulale', name: 'Sülale Bilgisi', type: 'tc', api: 'sulale' },
    { id: 'hane', name: 'Hane Bilgisi', type: 'tc', api: 'hane' },
    { id: 'isyeri', name: 'İşyeri Bilgisi', type: 'tc', api: 'isyeri' },
    { id: 'vesika', name: 'Vesika Bilgisi', type: 'tc', api: 'vesika' },
    { id: 'isegiris', name: 'İşe Giriş (İsim)', type: 'name', api: 'isegiris' },
    { id: 'ikametgah', name: 'İkametgah (İsim)', type: 'name', api: 'ikametgah' },
    { id: 'ailebirey', name: 'Aile Bireyi (İsim)', type: 'name', api: 'ailebirey' },
    { id: 'medenicinsiyet', name: 'Medeni Hal/Cinsiyet (İsim)', type: 'name', api: 'medenicinsiyet' },
    { id: 'ad', name: 'İsim Sorgu', type: 'name', api: 'ad' },
    { id: 'query', name: 'Kapsamlı Sorgu', type: 'city', api: 'query' },
    { id: 'gsm', name: 'GSM Sorgu', type: 'gsm', api: 'gsm' },
    { id: 'gsm2', name: 'GSM Sorgu 2', type: 'gsm', api: 'gsm2' },
    { id: 'plaka', name: 'Plaka Sorgu', type: 'plaka', api: 'plaka' },
    { id: 'test', name: 'Test', type: 'test', api: 'test' },
    { id: 'health', name: 'Health', type: 'test', api: 'health' }
];

app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/giris');
    }
});

app.get('/giris', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Giriş</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
            .container{max-width:400px;width:90%;background:white;padding:40px;border-radius:20px}
            h2{text-align:center;color:#333}
            input{width:100%;padding:12px;margin:10px 0;border:2px solid #ddd;border-radius:10px}
            button{width:100%;padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;cursor:pointer}
            .link{text-align:center;margin-top:15px}
            .link a{color:#667eea}
            .error{color:red;text-align:center;margin:10px 0}
        </style>
        </head>
        <body>
        <div class="container">
            <h2>🔐 Giriş Yap</h2>
            ${req.query.error ? '<div class="error">' + req.query.error + '</div>' : ''}
            <form method="POST" action="/giris">
                <input type="text" name="username" placeholder="Kullanıcı Adı" required>
                <input type="password" name="password" placeholder="Şifre" required>
                <button type="submit">Giriş Yap</button>
            </form>
            <div class="link">Hesabın yok mu? <a href="/kayit">Kayıt Ol</a></div>
        </div>
        </body>
        </html>
    `);
});

app.get('/kayit', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Kayıt</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
            .container{max-width:400px;width:90%;background:white;padding:40px;border-radius:20px}
            h2{text-align:center;color:#333}
            input{width:100%;padding:12px;margin:10px 0;border:2px solid #ddd;border-radius:10px}
            button{width:100%;padding:12px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;border:none;border-radius:10px;cursor:pointer}
            .link{text-align:center;margin-top:15px}
            .error{color:red;text-align:center}
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
            <div class="link">Zaten hesabın var? <a href="/giris">Giriş Yap</a></div>
        </div>
        </body>
        </html>
    `);
});

app.post('/kayit', async (req, res) => {
    const { username, password, confirm } = req.body;
    if (password !== confirm) return res.redirect('/kayit?error=Şifreler eşleşmiyor');
    if (users[username]) return res.redirect('/kayit?error=Kullanıcı var');
    const hashedPassword = await bcrypt.hash(password, 10);
    users[username] = { password: hashedPassword };
    saveUsers();
    res.redirect('/giris?success=Kayıt başarılı');
});

app.post('/giris', async (req, res) => {
    const { username, password } = req.body;
    const user = users[username];
    if (!user) return res.redirect('/giris?error=Kullanıcı yok');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.redirect('/giris?error=Hatalı şifre');
    req.session.userId = username;
    res.redirect('/dashboard');
});

app.get('/dashboard', requireLogin, (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;padding:20px;margin:0}
            .header{background:white;padding:20px;border-radius:15px;margin-bottom:20px;text-align:center;position:relative}
            h1{color:#ff4444;margin:0}
            .logout{position:absolute;top:15px;right:20px;background:#dc3545;color:white;padding:8px 15px;text-decoration:none;border-radius:8px}
            .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
            .btn{background:white;border:none;padding:12px;border-radius:10px;cursor:pointer;font-weight:bold}
            .btn:hover{transform:translateY(-2px);box-shadow:0 4px 8px rgba(0,0,0,0.2)}
        </style>
        </head>
        <body>
        <div class="header">
            <a href="/cikis" class="logout">Çıkış</a>
            <h1>/SEVEMEZSİNİZ</h1>
            <div>Hoşgeldin, ${req.session.userId}</div>
        </div>
        <div class="grid">
            ${apiList.map(api => `<button class="btn" onclick="window.location.href='/sorgu/${api.id}'">${api.name}</button>`).join('')}
        </div>
        </body>
        </html>
    `);
});

apiList.forEach(api => {
    app.get(`/sorgu/${api.id}`, requireLogin, (req, res) => {
        if (api.type === 'city') {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>${api.name}</title><meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px}
                    .container{max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:20px}
                    .back{color:#667eea;text-decoration:none}
                    input,button{width:100%;padding:12px;margin:10px 0;border-radius:10px}
                    button{background:#667eea;color:white;border:none;cursor:pointer}
                    .result{background:#f8f9fa;padding:15px;border-radius:10px;display:none;margin-top:20px;white-space:pre-wrap}
                    .error{background:#fee;color:#c00;padding:15px;border-radius:10px;display:none;margin-top:20px}
                </style>
                </head>
                <body>
                <div class="container">
                    <a href="/dashboard" class="back">← Geri</a>
                    <h2>${api.name}</h2>
                    <form onsubmit="sorgula(event)">
                        <input type="text" id="city" placeholder="İl Adı (Örn: Adana)" required>
                        <input type="text" id="name" placeholder="İsim (Opsiyonel)">
                        <button type="submit">Sorgula</button>
                    </form>
                    <div id="loading" style="display:none;text-align:center">Sorgulanıyor...</div>
                    <div id="result" class="result"></div>
                    <div id="error" class="error"></div>
                </div>
                <script>
                    async function sorgula(e){
                        e.preventDefault();
                        const city=document.getElementById('city').value;
                        const name=document.getElementById('name').value;
                        document.getElementById('loading').style.display='block';
                        document.getElementById('result').style.display='none';
                        document.getElementById('error').style.display='none';
                        let url='/api/proxy/query?city='+encodeURIComponent(city);
                        if(name) url+='&name='+encodeURIComponent(name);
                        try{
                            const res=await fetch(url+'&format=text');
                            const txt=await res.text();
                            if(res.ok){
                                document.getElementById('result').textContent=txt;
                                document.getElementById('result').style.display='block';
                            }else{
                                document.getElementById('error').textContent='Hata: '+txt;
                                document.getElementById('error').style.display='block';
                            }
                        }catch(err){
                            document.getElementById('error').textContent='Hata: '+err.message;
                            document.getElementById('error').style.display='block';
                        }
                        document.getElementById('loading').style.display='none';
                    }
                </script>
                </body>
                </html>
            `);
        } else {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head><title>${api.name}</title><meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body{font-family:Arial;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px}
                    .container{max-width:600px;margin:0 auto;background:white;padding:30px;border-radius:20px}
                    .back{color:#667eea;text-decoration:none}
                    input,button{width:100%;padding:12px;margin:10px 0;border-radius:10px}
                    button{background:#667eea;color:white;border:none;cursor:pointer}
                    .result{background:#f8f9fa;padding:15px;border-radius:10px;display:none;margin-top:20px;white-space:pre-wrap}
                    .error{background:#fee;color:#c00;padding:15px;border-radius:10px;display:none;margin-top:20px}
                </style>
                </head>
                <body>
                <div class="container">
                    <a href="/dashboard" class="back">← Geri</a>
                    <h2>${api.name}</h2>
                    <form onsubmit="sorgula(event)">
                        ${api.type === 'name' ? 
                            '<input type="text" id="name" placeholder="İsim" required><input type="text" id="surname" placeholder="Soyisim" required>' : 
                            '<input type="text" id="input" placeholder="Değer girin" required>'}
                        <button type="submit">Sorgula</button>
                    </form>
                    <div id="loading" style="display:none;text-align:center">Sorgulanıyor...</div>
                    <div id="result" class="result"></div>
                    <div id="error" class="error"></div>
                </div>
                <script>
                    async function sorgula(e){
                        e.preventDefault();
                        document.getElementById('loading').style.display='block';
                        document.getElementById('result').style.display='none';
                        document.getElementById('error').style.display='none';
                        let url='/api/proxy/${api.api}';
                        ${api.type === 'tc' ? `url+='?tc='+encodeURIComponent(document.getElementById('input').value);` : ''}
                        ${api.type === 'gsm' ? `url+='?gsm='+encodeURIComponent(document.getElementById('input').value);` : ''}
                        ${api.type === 'plaka' ? `url+='?plaka='+encodeURIComponent(document.getElementById('input').value);` : ''}
                        ${api.type === 'name' ? `url+='?name='+encodeURIComponent(document.getElementById('name').value)+'&surname='+encodeURIComponent(document.getElementById('surname').value);` : ''}
                        url+='&format=text';
                        try{
                            const res=await fetch(url);
                            const txt=await res.text();
                            if(res.ok){
                                document.getElementById('result').textContent=txt;
                                document.getElementById('result').style.display='block';
                            }else{
                                document.getElementById('error').textContent='Hata: '+txt;
                                document.getElementById('error').style.display='block';
                            }
                        }catch(err){
                            document.getElementById('error').textContent='Hata: '+err.message;
                            document.getElementById('error').style.display='block';
                        }
                        document.getElementById('loading').style.display='none';
                    }
                </script>
                </body>
                </html>
            `);
        }
    });
});

app.get('/api/proxy/:endpoint', async (req, res) => {
    try {
        const { endpoint } = req.params;
        const query = new URLSearchParams(req.query).toString();
        const apiUrl = `https://apilerimya.onrender.com/${endpoint}${query ? '?' + query : ''}`;
        const response = await axios.get(apiUrl, { timeout: 15000 });
        res.set('Content-Type', 'text/plain; charset=utf-8');
        res.send(response.data);
    } catch (error) {
        res.status(500).send('API hatası: ' + error.message);
    }
});

app.get('/cikis', (req, res) => {
    req.session.destroy();
    res.redirect('/giris');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('Sunucu çalışıyor: http://localhost:' + PORT);
});
