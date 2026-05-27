import { useEffect, useMemo, useState } from 'react';
import Building2 from 'lucide-react/dist/esm/icons/building-2.js';
import Copy from 'lucide-react/dist/esm/icons/copy.js';
import Download from 'lucide-react/dist/esm/icons/download.js';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link.js';
import ImagePlus from 'lucide-react/dist/esm/icons/image-plus.js';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2.js';
import MapPin from 'lucide-react/dist/esm/icons/map-pin.js';
import Phone from 'lucide-react/dist/esm/icons/phone.js';
import Plus from 'lucide-react/dist/esm/icons/plus.js';
import UploadCloud from 'lucide-react/dist/esm/icons/upload-cloud.js';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' && window.location.port === '5173' ? 'http://localhost:3333' : '');

function apiUrl(path) {
  return `${API_URL}${path}`;
}

function assetUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `${API_URL}${path}`;
}

function formatFileCount(files) {
  if (!files?.length) return 'Nenhuma foto selecionada';
  return files.length === 1 ? '1 foto selecionada' : `${files.length} fotos selecionadas`;
}

function App() {
  const path = window.location.pathname;

  if (path.startsWith('/imovel/')) {
    return <PublicProperty slug={decodeURIComponent(path.replace('/imovel/', ''))} />;
  }

  return <AdminPanel />;
}

function AdminPanel() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    contact: ''
  });
  const [photos, setPhotos] = useState([]);

  async function loadProperties() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(apiUrl('/api/properties'));
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Nao foi possivel carregar os imoveis.');
      setProperties(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProperties();
  }, []);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.title || !form.description || !form.price || !form.location || !form.contact) {
      setError('Preencha todos os campos obrigatorios.');
      return;
    }

    if (photos.length === 0) {
      setError('Selecione pelo menos uma foto do imovel.');
      return;
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => payload.append(key, value));
    photos.forEach((photo) => payload.append('photos', photo));

    setSubmitting(true);
    try {
      const response = await fetch(apiUrl('/api/properties'), {
        method: 'POST',
        body: payload
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Nao foi possivel cadastrar o imovel.');

      setProperties((current) => [data, ...current]);
      setForm({ title: '', description: '', price: '', location: '', contact: '' });
      setPhotos([]);
      event.target.reset();
      setMessage(`Imovel cadastrado. Link publico: ${data.publicUrl}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink(link) {
    await navigator.clipboard.writeText(link);
    setMessage('Link copiado para a area de transferencia.');
  }

  return (
    <main className="admin-shell">
      <section className="admin-header">
        <div>
          <div className="brand-mark">
            <Building2 size={22} />
            <span>123 New House</span>
          </div>
          <h1>Compartilhador de Imoveis</h1>
          <p>Cadastre imoveis, envie fotos e gere links publicos elegantes para seus clientes.</p>
        </div>
        <a className="header-link" href="/admin">
          Painel administrativo
        </a>
      </section>

      <section className="admin-grid">
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="form-title">
            <Plus size={22} />
            <h2>Novo imovel</h2>
          </div>

          {error && <div className="alert error">{error}</div>}
          {message && <div className="alert success">{message}</div>}

          <label>
            Titulo do imovel
            <input name="title" value={form.title} onChange={updateField} placeholder="Casa Jardim Imperial 123" required />
          </label>

          <label>
            Descricao completa
            <textarea
              name="description"
              value={form.description}
              onChange={updateField}
              placeholder="Ambientes, diferenciais, metragem, vagas, acabamento..."
              rows="7"
              required
            />
          </label>

          <div className="two-columns">
            <label>
              Valor
              <input name="price" value={form.price} onChange={updateField} placeholder="R$ 850.000" required />
            </label>
            <label>
              Bairro/cidade
              <input name="location" value={form.location} onChange={updateField} placeholder="Jardim Imperial, Cuiaba" required />
            </label>
          </div>

          <label>
            Dados de contato
            <input name="contact" value={form.contact} onChange={updateField} placeholder="WhatsApp, telefone ou e-mail" required />
          </label>

          <label className="upload-box">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setPhotos(Array.from(event.target.files || []))}
            />
            <UploadCloud size={30} />
            <strong>Selecionar fotos do imovel</strong>
            <span>{formatFileCount(photos)}</span>
          </label>

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={18} /> : <ImagePlus size={18} />}
            Cadastrar e gerar link
          </button>
        </form>

        <aside className="property-list">
          <div className="list-heading">
            <h2>Imoveis cadastrados</h2>
            <span>{properties.length}</span>
          </div>

          {loading && <p className="muted">Carregando imoveis...</p>}
          {!loading && properties.length === 0 && <p className="muted">Nenhum imovel cadastrado ainda.</p>}

          <div className="list-stack">
            {properties.map((property) => (
              <article className="property-card" key={property.id}>
                {property.photos[0] && <img src={assetUrl(property.photos[0].url)} alt={property.title} />}
                <div>
                  <h3>{property.title}</h3>
                  <p>
                    <MapPin size={15} />
                    {property.location}
                  </p>
                  <strong>{property.price}</strong>
                  <div className="card-actions">
                    <button type="button" onClick={() => copyLink(property.publicUrl)} aria-label="Copiar link">
                      <Copy size={17} />
                    </button>
                    <a href={`/imovel/${property.slug}`} target="_blank" rel="noreferrer" aria-label="Abrir pagina publica">
                      <ExternalLink size={17} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function PublicProperty({ slug }) {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    async function loadProperty() {
      try {
        const response = await fetch(apiUrl(`/api/properties/${slug}`));
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || 'Nao foi possivel carregar o imovel.');
        setProperty(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [slug]);

  const activePhoto = useMemo(() => property?.photos?.[activeIndex] || property?.photos?.[0], [property, activeIndex]);

  if (loading) {
    return (
      <main className="public-state">
        <Loader2 className="spin" size={34} />
        <p>Carregando imovel...</p>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="public-state">
        <Building2 size={38} />
        <h1>Imovel nao encontrado</h1>
        <p>{error || 'Verifique se o link esta correto.'}</p>
      </main>
    );
  }

  return (
    <main className="public-page">
      <section className="public-hero">
        <div className="hero-media">
          {activePhoto ? <img src={assetUrl(activePhoto.url)} alt={property.title} /> : <div className="empty-photo">Sem fotos</div>}
        </div>
        <div className="hero-content">
          <div className="brand-mark light">
            <Building2 size={22} />
            <span>123 New House</span>
          </div>
          <h1>{property.title}</h1>
          <div className="hero-meta">
            <span>
              <MapPin size={18} />
              {property.location}
            </span>
            <span>{property.price}</span>
          </div>
          <a className="download-button" href={apiUrl(property.downloadUrl)}>
            <Download size={19} />
            Baixar fotos do imovel
          </a>
        </div>
      </section>

      <section className="public-content">
        <div className="description-panel">
          <h2>Descricao completa</h2>
          <p>{property.description}</p>
          <div className="contact-strip">
            <Phone size={19} />
            <span>{property.contact}</span>
          </div>
        </div>

        <div className="gallery-panel">
          <div className="gallery-heading">
            <h2>Galeria de fotos</h2>
            <span>{property.photos.length} fotos</span>
          </div>
          <div className="thumb-grid">
            {property.photos.map((photo, index) => (
              <div className="photo-item" key={photo.id}>
                <button
                  className={index === activeIndex ? 'thumb active' : 'thumb'}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                >
                  <img src={assetUrl(photo.url)} alt={`${property.title} foto ${index + 1}`} />
                </button>
                <a
                  className="single-download"
                  href={apiUrl(photo.downloadUrl)}
                  aria-label={`Baixar foto ${index + 1}`}
                >
                  <Download size={16} />
                  <span>Baixar</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
