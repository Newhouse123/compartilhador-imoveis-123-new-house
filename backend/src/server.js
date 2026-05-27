import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import archiver from 'archiver';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import slugify from 'slugify';
import { db, mapProperty } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(rootDir, 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 3333);
const configuredPublicBaseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const frontendDistDir = path.resolve(rootDir, '..', 'frontend', 'dist');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));
app.use(express.static(frontendDistDir));

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 12 * 1024 * 1024,
    files: 30
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Envie apenas arquivos de imagem.'));
      return;
    }
    cb(null, true);
  }
});

const getPhotos = db.prepare('SELECT * FROM photos WHERE property_id = ? ORDER BY id ASC');
const getPropertyBySlug = db.prepare('SELECT * FROM properties WHERE slug = ?');
const getPropertyById = db.prepare('SELECT * FROM properties WHERE id = ?');
const getPhotoByProperty = db.prepare('SELECT * FROM photos WHERE id = ? AND property_id = ?');
const slugExists = db.prepare('SELECT id FROM properties WHERE slug = ?');

function requestBaseUrl(req) {
  if (configuredPublicBaseUrl) return configuredPublicBaseUrl;

  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

function photoToPublic(photo, slug, req) {
  return {
    id: photo.id,
    filename: photo.filename,
    originalName: photo.original_name,
    mimetype: photo.mimetype,
    size: photo.size,
    url: `/uploads/${photo.filename}`,
    downloadUrl: slug ? `/api/properties/${slug}/photos/${photo.id}/download` : null,
    fullUrl: `${requestBaseUrl(req)}/uploads/${photo.filename}`
  };
}

function buildSlug(title) {
  const base = slugify(title, { lower: true, strict: true, trim: true }) || 'imovel';
  let slug = base;
  let suffix = 2;

  while (slugExists.get(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function publicPropertyUrl(slug, req) {
  return `${requestBaseUrl(req)}/imovel/${slug}`;
}

function validatePropertyInput(body, files) {
  const required = ['title', 'description', 'price', 'location', 'contact'];
  const missing = required.filter((field) => !String(body[field] || '').trim());

  if (missing.length > 0) {
    return `Preencha os campos obrigatorios: ${missing.join(', ')}.`;
  }

  if (!files || files.length === 0) {
    return 'Envie pelo menos uma foto do imovel.';
  }

  return null;
}

function cleanupUploadedFiles(files = []) {
  for (const file of files) {
    fs.rm(file.path, { force: true }, () => {});
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Compartilhador de Imoveis 123 New House' });
});

app.get('/api/properties', (req, res) => {
  const rows = db.prepare('SELECT * FROM properties ORDER BY created_at DESC').all();
  const properties = rows.map((row) => {
    const photos = getPhotos.all(row.id).map((photo) => photoToPublic(photo, row.slug, req));
    return {
      ...mapProperty(row, photos),
      publicUrl: publicPropertyUrl(row.slug, req),
      downloadUrl: `/api/properties/${row.slug}/download`
    };
  });

  res.json(properties);
});

app.post('/api/properties', upload.array('photos', 30), (req, res, next) => {
  try {
    const validationError = validatePropertyInput(req.body, req.files);
    if (validationError) {
      cleanupUploadedFiles(req.files);
      return res.status(400).json({ error: validationError });
    }

    const title = String(req.body.title).trim();
    const slug = buildSlug(title);

    const createProperty = db.transaction(() => {
      const result = db
        .prepare(
          'INSERT INTO properties (title, description, price, location, contact, slug) VALUES (?, ?, ?, ?, ?, ?)'
        )
        .run(
          title,
          String(req.body.description).trim(),
          String(req.body.price).trim(),
          String(req.body.location).trim(),
          String(req.body.contact).trim(),
          slug
        );

      const insertPhoto = db.prepare(
        'INSERT INTO photos (property_id, filename, original_name, mimetype, size) VALUES (?, ?, ?, ?, ?)'
      );

      for (const file of req.files) {
        insertPhoto.run(result.lastInsertRowid, file.filename, file.originalname, file.mimetype, file.size);
      }

      return result.lastInsertRowid;
    });

    const id = createProperty();
    const row = getPropertyById.get(id);
    const photos = getPhotos.all(id).map((photo) => photoToPublic(photo, row.slug, req));

    res.status(201).json({
      ...mapProperty(row, photos),
      publicUrl: publicPropertyUrl(row.slug, req),
      downloadUrl: `/api/properties/${row.slug}/download`
    });
  } catch (error) {
    cleanupUploadedFiles(req.files);
    next(error);
  }
});

app.get('/api/properties/:slug', (req, res) => {
  const row = getPropertyBySlug.get(req.params.slug);

  if (!row) {
    return res.status(404).json({ error: 'Imovel nao encontrado.' });
  }

  const photos = getPhotos.all(row.id).map((photo) => photoToPublic(photo, row.slug, req));
  res.json({
    ...mapProperty(row, photos),
    publicUrl: publicPropertyUrl(row.slug, req),
    downloadUrl: `/api/properties/${row.slug}/download`
  });
});

app.get('/api/properties/:slug/download', (req, res, next) => {
  const row = getPropertyBySlug.get(req.params.slug);

  if (!row) {
    return res.status(404).json({ error: 'Imovel nao encontrado.' });
  }

  const photos = getPhotos.all(row.id);
  if (photos.length === 0) {
    return res.status(404).json({ error: 'Este imovel nao possui fotos.' });
  }

  const archiveName = `${row.slug}-fotos.zip`;
  res.attachment(archiveName);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', next);
  archive.pipe(res);

  for (const photo of photos) {
    const filePath = path.join(uploadDir, photo.filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: photo.original_name || photo.filename });
    }
  }

  archive.finalize();
});

app.get('/api/properties/:slug/photos/:photoId/download', (req, res) => {
  const row = getPropertyBySlug.get(req.params.slug);

  if (!row) {
    return res.status(404).json({ error: 'Imovel nao encontrado.' });
  }

  const photo = getPhotoByProperty.get(Number(req.params.photoId), row.id);
  if (!photo) {
    return res.status(404).json({ error: 'Foto nao encontrada.' });
  }

  const filePath = path.join(uploadDir, photo.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo da foto nao encontrado.' });
  }

  res.download(filePath, photo.original_name || photo.filename);
});

app.get(/^(?!\/api\/|\/uploads\/).*/, (_req, res, next) => {
  const indexPath = path.join(frontendDistDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return next();
  }

  res.sendFile(indexPath);
});

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Erro no upload: ${err.message}` });
  }

  res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`API pronta em http://localhost:${port}`);
});
