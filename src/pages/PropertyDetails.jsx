import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProperties } from '../context/PropertyContext';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { WHATSAPP_NUMBER } from '../App';
import { safeUrl } from '../utils/safeUrl';

const mapIcon = new L.DivIcon({
  className: 'custom-map-marker',
  html: `<div class="marker-pin"></div>`,
  iconSize: [30, 42],
  iconAnchor: [15, 42]
});

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;
const isVideo = (url) => VIDEO_EXT.test(url || '');

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { properties } = useProperties();

  const property = properties.find(p => p.id === id);
  const gallery = Array.isArray(property?.gallery) ? property.gallery : [];
  const documents = Array.isArray(property?.documents) ? property.documents : [];

  // Spec rows come from the individual dashboard fields. Blank ones are dropped
  // so older listings that predate these columns render exactly as before.
  // These three come straight from dashboard text inputs, so scrub anything
  // that is not a plain http(s) link before it is used as an href.
  const mapsUrl = safeUrl(property?.maps_url);
  const fbUrl = safeUrl(property?.fb_url);
  const instaUrl = safeUrl(property?.insta_url);

  const specs = [
    { label: 'Site No', value: property?.site_no },
    { label: 'Dimension', value: property?.size },
    { label: 'Facing', value: property?.facing },
    { label: 'Location', value: property?.location_text },
    { label: 'Price', value: property?.price },
    { label: 'Contact', value: property?.contact, href: property?.contact ? `tel:${property.contact}` : null },
    { label: 'Google Location', value: mapsUrl ? 'View on Google Maps' : '', href: mapsUrl }
  ].filter(s => s.value);

  // Lightbox can show either the gallery or the document images.
  const [lightbox, setLightbox] = useState(null); // { items: string[], index: number }
  const isOpen = lightbox !== null;
  const lbItems = lightbox?.items ?? [];

  const openLightbox = useCallback((items, index) => setLightbox({ items, index }), []);
  const close = useCallback(() => setLightbox(null), []);
  const next = useCallback(() => {
    setLightbox((lb) => (lb === null ? lb : { ...lb, index: (lb.index + 1) % lb.items.length }));
  }, []);
  const prev = useCallback(() => {
    setLightbox((lb) => (lb === null ? lb : { ...lb, index: (lb.index - 1 + lb.items.length) % lb.items.length }));
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const shareData = { title: property?.title || 'Property', text: property?.title || '', url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    } catch {
      window.prompt('Copy this link:', url);
    }
  }, [property?.title]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, next, prev]);

  if (!property) {
    return (
      <div className="pt-main" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2>Property Not Found</h2>
        <button className="button" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="property-details-page">
      <div className="pd-hero">
        <img src={property.image} alt={property.title} className="pd-hero-bg" style={{ viewTransitionName: 'hero-image' }} />
        <div className="pd-hero-overlay"></div>
        <div className="holder">
          <button className="button back-btn" onClick={() => navigate(-1)}>← Back to Listings</button>
          <h1>{property.title}</h1>
          <div className="pd-meta">
            <span>{property.type}</span> | <span>{property.size}</span> | <span>{property.price}</span>
          </div>
        </div>
      </div>

      <div className="holder pd-content">
        <div className="pd-col pd-main">
          <h2>About this property</h2>
          {property.description && <p>{property.description}</p>}

          {specs.length > 0 && (
            <dl className="pd-specs">
              {specs.map(({ label, value, href }) => (
                <div className="pd-spec-row" key={label}>
                  <dt>{label}</dt>
                  <dd>
                    {href
                      ? <a href={href} target={href.startsWith('tel:') ? undefined : '_blank'} rel="noreferrer">{value}</a>
                      : value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="pd-col pd-sidebar">
          <h3>Location</h3>
          <div className="pd-map">
            <MapContainer center={[property.lat, property.lng]} zoom={14} scrollWheelZoom={false} style={{ width: '100%', height: '100%' }}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap contributors &copy; CARTO" subdomains="abcd" maxZoom={20} />
              <Marker position={[property.lat, property.lng]} icon={mapIcon} />
            </MapContainer>
          </div>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I'm interested in "${property.title}". ${window.location.href}`)}`}
            target="_blank"
            rel="noreferrer"
            className="button pd-contact"
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            Chat on WhatsApp
          </a>
          <a
            href={mapsUrl || `https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`}
            target="_blank"
            rel="noreferrer"
            className="button pd-contact"
            style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', backgroundColor: 'transparent', border: '1px solid var(--c2)', color: 'var(--c2)' }}
          >
            Open in Google Maps
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="button pd-contact"
            style={{ marginTop: '15px', display: 'flex', justifyContent: 'center', backgroundColor: 'transparent', border: '1px solid var(--c2)', color: 'var(--c2)' }}
          >
            Share this property
          </button>

          {(fbUrl || instaUrl) && (
            <div className="pd-social">
              {fbUrl && (
                <a href={fbUrl} target="_blank" rel="noreferrer" className="pd-social-link" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" /></svg>
                  Facebook
                </a>
              )}
              {instaUrl && (
                <a href={instaUrl} target="_blank" rel="noreferrer" className="pd-social-link" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zm0 3.24a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2zm0 10.88a4.28 4.28 0 1 1 0-8.56 4.28 4.28 0 0 1 0 8.56zm6.85-11.13a1.54 1.54 0 1 1-3.08 0 1.54 1.54 0 0 1 3.08 0z" /></svg>
                  Instagram
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {gallery.length > 0 && (
        <div className="holder pd-gallery">
          <h2>Gallery</h2>
          <div className="pd-gallery-grid">
            {gallery.map((url, i) => (
              <button key={i} className="pd-gallery-item" onClick={() => openLightbox(gallery, i)} aria-label={`Open media ${i + 1}`}>
                {isVideo(url) ? (
                  <>
                    <video src={url} muted playsInline preload="metadata" />
                    <span className="pd-play-badge" aria-hidden="true">▶</span>
                  </>
                ) : (
                  <img src={url} alt={`${property.title} gallery ${i + 1}`} loading="lazy" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {documents.length > 0 && (
        <div className="holder pd-gallery pd-documents">
          <h2>Documents</h2>
          <div className="pd-gallery-grid">
            {documents.map((url, i) => (
              <button key={i} className="pd-gallery-item" onClick={() => openLightbox(documents, i)} aria-label={`Open document ${i + 1}`}>
                <img src={url} alt={`${property.title} document ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="pd-lightbox" onClick={close}>
          <button className="pd-lb-close" onClick={close} aria-label="Close">×</button>

          {lbItems.length > 1 && (
            <button className="pd-lb-arrow pd-lb-prev" onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous">‹</button>
          )}

          <div className="pd-lb-stage" onClick={(e) => e.stopPropagation()}>
            {isVideo(lbItems[lightbox.index]) ? (
              <video src={lbItems[lightbox.index]} controls autoPlay className="pd-lb-media" />
            ) : (
              <img src={lbItems[lightbox.index]} alt={`${property.title} ${lightbox.index + 1}`} className="pd-lb-media" />
            )}
            <div className="pd-lb-counter">{lightbox.index + 1} / {lbItems.length}</div>
          </div>

          {lbItems.length > 1 && (
            <button className="pd-lb-arrow pd-lb-next" onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next">›</button>
          )}
        </div>
      )}
    </div>
  );
}
