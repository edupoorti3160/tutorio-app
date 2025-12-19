const fs = require('fs');
const path = require('path');

// Configuración: Carpetas y archivos a ignorar
const IGNORE_DIRS = ['node_modules', '.next', '.git', '.vscode', 'public', 'build', 'dist'];
const IGNORE_FILES = ['package-lock.json', 'yarn.lock', 'preparar_codigo.js', '.DS_Store', '.env.local', '.env'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json', '.sql'];

// Nombre del archivo de salida
const OUTPUT_FILE = 'proyecto_completo.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    
    if (fs.statSync(fullPath).isDirectory()) {
      if (!IGNORE_DIRS.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      // Filtrar por extensiones permitidas y archivos ignorados
      const ext = path.extname(file);
      if (!IGNORE_FILES.includes(file) && ALLOWED_EXTENSIONS.includes(ext)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const projectFiles = getAllFiles(process.cwd());
let content = "REPORTE DE CODIGO DEL PROYECTO\n=================================\n\n";

projectFiles.forEach(file => {
  const relativePath = path.relative(process.cwd(), file);
  content += `\n--- INICIO ARCHIVO: ${relativePath} ---\n`;
  content += fs.readFileSync(file, 'utf8');
  content += `\n--- FIN ARCHIVO: ${relativePath} ---\n`;
});

fs.writeFileSync(OUTPUT_FILE, content);

console.log(`✅ ¡Listo! Se ha creado el archivo "${OUTPUT_FILE}" con todo tu código.`);
console.log(`📂 Ahora sube ese archivo al chat.`);