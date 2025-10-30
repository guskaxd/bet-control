const express = require("express");
const session = require("express-session"); 
const path = require("path");
const db = require("./database"); 
const MySQLStore = require("express-mysql-session")(session); 

const app = express();

const contaRoutes = require("./routes/contaRoutes");
const lancamentoRoutes = require("./routes/lancamentoRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");

const bodyParser = require("body-parser");

// Configurações
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

const sessionStore = new MySQLStore({
  expiration: 86400000, // Tempo da sessão em milissegundos (ex: 1 dia)
  createDatabaseTable: true, // Cria a tabela 'sessions' automaticamente
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, db); 
// Sessão
// 4. ALTERE A CONFIGURAÇÃO DA SESSÃO
app.use(
  session({
    secret: "segredo-super-seguro", // Mude para uma frase secreta mais forte
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Usa o armazenamento no MySQL
    cookie: {
        secure: false, // Em produção real com HTTPS, mude para true
        maxAge: 86400000 // Mesmo tempo da expiração
    }
  })
);

// Middleware global para passar dados de sessão para todas as views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Rotas API
app.use("/api/contas", contaRoutes);
app.use("/api/lancamentos", lancamentoRoutes);
app.use("/", authRoutes); // em vez de /api/auth
app.use("/admin", adminRoutes);

// Middleware de proteção
function protegerRota(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

// Páginas
app.get("/login", (req, res) => res.render("auth/login"));
app.get("/register", (req, res) => res.render("auth/register"));
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// Páginas protegidas
// Página inicial (pública para visitantes, dashboard para logados)
app.get("/", (req, res) => {
  if (req.session.user) {
    res.render("pages/dashboard");
  } else {
    res.render("index"); // homepage pública
  }
});

app.get("/contas", protegerRota, (req, res) => res.render("pages/contas"));
app.get("/lancamentos", protegerRota, (req, res) => res.render("pages/lancamentos"));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor rodando na porat ${PORT}`));
