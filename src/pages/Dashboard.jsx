import { useState, useEffect } from 'react';
import { useProperties } from '../context/PropertyContext';
import { supabase } from '../supabaseClient';
import { isSafeUrl } from '../utils/safeUrl';

// Property types. "Site" replaces the old "Plot" label.
export const PROPERTY_TYPES = ['Site', 'Villa', 'Apartment', 'Agricultural Land', 'Farmland', 'Rent'];

const EMPTY_FORM = {
  title: '', type: 'Site', city: '', size: '', price: '',
  lat: '', lng: '', image: '', description: '', gallery: [],
  documents: [], fb_url: '', insta_url: '', maps_url: '',
  site_no: '', facing: '', location_text: '', contact: ''
};

const DEFAULT_CITIES = ['Mysore', 'Bangalore'];

export default function Dashboard() {
  const { properties, addProperty, deleteProperty, editProperty } = useProperties();
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [documentFiles, setDocumentFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [addingCity, setAddingCity] = useState(false);
  const [tab, setTab] = useState('properties');
  const [inquiries, setInquiries] = useState([]);

  const cityOptions = Array.from(
    new Set([...DEFAULT_CITIES, ...properties.map(p => p.city).filter(Boolean)])
  ).sort();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchInquiries = async () => {
    const { data, error } = await supabase
      .from('inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setInquiries(data || []);
  };

  useEffect(() => {
    if (session) fetchInquiries();
  }, [session]);

  const deleteInquiry = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return;
    const { error } = await supabase.from('inquiries').delete().eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setInquiries((prev) => prev.filter((q) => q.id !== id));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const uploadImage = async (file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('plot-images').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('plot-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reject anything that is not a plain http(s) link so a bad scheme never
    // reaches the database and, from there, a visitor's browser.
    const linkFields = [
      ['Facebook URL', form.fb_url],
      ['Instagram URL', form.insta_url],
      ['Google Maps URL', form.maps_url]
    ];
    const badLink = linkFields.find(([, value]) => value.trim() && !isSafeUrl(value.trim()));
    if (badLink) {
      alert(`${badLink[0]} must be a full http:// or https:// link.`);
      return;
    }

    setUploading(true);
    try {
      let imageUrl = form.image;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      let gallery = [...(form.gallery || [])];
      if (galleryFiles.length > 0) {
        const uploaded = await Promise.all(galleryFiles.map(uploadImage));
        gallery = [...gallery, ...uploaded];
      }

      let documents = [...(form.documents || [])];
      if (documentFiles.length > 0) {
        const uploaded = await Promise.all(documentFiles.map(uploadImage));
        documents = [...documents, ...uploaded];
      }

      const payload = {
        title: form.title,
        type: form.type,
        city: form.city.trim(),
        size: form.size,
        price: form.price,
        description: form.description,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        image: imageUrl,
        gallery,
        documents,
        fb_url: form.fb_url.trim(),
        insta_url: form.insta_url.trim(),
        maps_url: form.maps_url.trim(),
        site_no: form.site_no.trim(),
        facing: form.facing.trim(),
        location_text: form.location_text.trim(),
        contact: form.contact.trim()
      };

      if (editingId) {
        await editProperty(editingId, payload);
      } else {
        await addProperty(payload);
      }
      resetForm();
    } catch (error) {
      alert(error.message || 'Error saving property');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setGalleryFiles([]);
    setDocumentFiles([]);
    setAddingCity(false);
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setAddingCity(false);
    setForm({
      title: p.title || '',
      type: PROPERTY_TYPES.includes(p.type) ? p.type : (p.type === 'Plot' ? 'Site' : 'Site'),
      city: p.city || '',
      size: p.size || '',
      price: p.price || '',
      lat: p.lat ?? '',
      lng: p.lng ?? '',
      image: p.image || '',
      description: p.description || '',
      gallery: Array.isArray(p.gallery) ? p.gallery : [],
      documents: Array.isArray(p.documents) ? p.documents : [],
      fb_url: p.fb_url || '',
      insta_url: p.insta_url || '',
      maps_url: p.maps_url || '',
      site_no: p.site_no || '',
      facing: p.facing || '',
      location_text: p.location_text || '',
      contact: p.contact || ''
    });
    setImageFile(null);
    setGalleryFiles([]);
    setDocumentFiles([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const removeExistingGalleryImage = (url) => {
    setForm((f) => ({ ...f, gallery: f.gallery.filter((g) => g !== url) }));
  };

  const removeExistingDocument = (url) => {
    setForm((f) => ({ ...f, documents: f.documents.filter((d) => d !== url) }));
  };

  const handleDelete = async (p) => {
    if (window.confirm(`Remove "${p.title}"? This cannot be undone.`)) {
      try {
        await deleteProperty(p.id);
        if (editingId === p.id) resetForm();
      } catch (error) {
        alert(error.message || 'Error removing property');
      }
    }
  };

  if (!session) {
    return (
      <div className="dash-login-screen">
        <div className="dash-login-card">
          <h2>Broker Login</h2>
          <p className="dash-login-sub">Sign in to manage your properties</p>
          <form onSubmit={handleLogin} className="dash-pro-form">
            <label>
              <span>Email</span>
              <input required type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            </label>
            <label>
              <span>Password</span>
              <input required type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </label>
            <button className="dash-btn dash-btn-primary" type="submit" disabled={authLoading}>
              {authLoading ? 'Signing in…' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-pro">
      <header className="dash-topbar">
        <div>
          <h1>Broker Dashboard</h1>
          <p>{properties.length} {properties.length === 1 ? 'property' : 'properties'} listed</p>
        </div>
        <button className="dash-btn dash-btn-ghost" onClick={handleLogout}>Log Out</button>
      </header>

      <div className="dash-tabs">
        <button className={`dash-tab${tab === 'properties' ? ' active' : ''}`} onClick={() => setTab('properties')}>Properties</button>
        <button className={`dash-tab${tab === 'inquiries' ? ' active' : ''}`} onClick={() => setTab('inquiries')}>
          Inquiries {inquiries.length > 0 && <span className="dash-tab-badge">{inquiries.length}</span>}
        </button>
      </div>

      {tab === 'inquiries' ? (
        <section className="dash-panel">
          <h2>Customer Inquiries</h2>
          {inquiries.length === 0 ? (
            <p className="dash-empty">No inquiries yet. Submissions from the website contact form will appear here.</p>
          ) : (
            <div className="dash-inq-list">
              {inquiries.map((q) => (
                <div className="dash-inq-row" key={q.id}>
                  <div className="dash-inq-main">
                    <h3>{q.fullname}</h3>
                    {q.phone && <a className="dash-inq-phone" href={`tel:${q.phone}`}>{q.phone}</a>}
                    {q.message && <p className="dash-inq-msg">{q.message}</p>}
                  </div>
                  <div className="dash-inq-side">
                    <span className="dash-inq-date">{new Date(q.created_at).toLocaleString()}</span>
                    <button className="dash-btn dash-btn-sm dash-btn-danger" onClick={() => deleteInquiry(q.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
      <div className="dash-grid">
        {/* FORM PANEL */}
        <section className="dash-panel dash-form-panel">
          <h2>{editingId ? 'Edit Property' : 'Add New Property'}</h2>
          <form onSubmit={handleSubmit} className="dash-pro-form">
            <label>
              <span>Title</span>
              <input required type="text" placeholder="e.g. Premium Plot in Mysore" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </label>

            <div className="dash-form-row">
              <label>
                <span>Type</span>
                <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label>
                <span>Site No <small>(optional)</small></span>
                <input type="text" placeholder="e.g. 143" value={form.site_no} onChange={e => setForm({ ...form, site_no: e.target.value })} />
              </label>
            </div>

            <div className="dash-form-row">
              <label>
                <span>Dimension / Size</span>
                <input required type="text" placeholder="e.g. 30'x40'" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} />
              </label>
              <label>
                <span>Facing <small>(optional)</small></span>
                <input type="text" placeholder="e.g. South" value={form.facing} onChange={e => setForm({ ...form, facing: e.target.value })} />
              </label>
            </div>

            <label>
              <span>City</span>
              {addingCity ? (
                <div className="dash-city-add">
                  <input
                    required
                    autoFocus
                    type="text"
                    placeholder="Enter new city name"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                  />
                  <button
                    type="button"
                    className="dash-btn dash-btn-sm"
                    onClick={() => { setAddingCity(false); setForm({ ...form, city: '' }); }}
                  >
                    Pick existing
                  </button>
                </div>
              ) : (
                <select
                  required
                  value={form.city}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setAddingCity(true);
                      setForm({ ...form, city: '' });
                    } else {
                      setForm({ ...form, city: e.target.value });
                    }
                  }}
                >
                  <option value="" disabled>Select a city…</option>
                  {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Add new city…</option>
                </select>
              )}
            </label>

            <label>
              <span>Location <small>(optional — full address line)</small></span>
              <input type="text" placeholder="e.g. KBL Silicon City, 100 feet from KRS main road, beside Infosys, Mysore" value={form.location_text} onChange={e => setForm({ ...form, location_text: e.target.value })} />
            </label>

            <div className="dash-form-row">
              <label>
                <span>Price</span>
                <input required type="text" placeholder="e.g. ₹4500/- per sqft" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </label>
              <label>
                <span>Contact <small>(optional)</small></span>
                <input type="tel" placeholder="e.g. 09886048471" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
              </label>
            </div>

            <div className="dash-form-row">
              <label>
                <span>Latitude</span>
                <input required type="number" step="0.00001" placeholder="12.2958" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
              </label>
              <label>
                <span>Longitude</span>
                <input required type="number" step="0.00001" placeholder="76.6394" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} />
              </label>
            </div>

            <label>
              <span>Description <small>(optional — the details above already show as a spec list)</small></span>
              <textarea rows={3} placeholder="Any extra notes about the property…" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </label>

            <label>
              <span>Google Maps link <small>(optional — overrides the auto map link)</small></span>
              <input type="url" placeholder="https://maps.app.goo.gl/…" value={form.maps_url} onChange={e => setForm({ ...form, maps_url: e.target.value })} />
            </label>

            <div className="dash-form-row">
              <label>
                <span>Facebook link <small>(optional)</small></span>
                <input type="url" placeholder="https://facebook.com/…" value={form.fb_url} onChange={e => setForm({ ...form, fb_url: e.target.value })} />
              </label>
              <label>
                <span>Instagram link <small>(optional)</small></span>
                <input type="url" placeholder="https://instagram.com/…" value={form.insta_url} onChange={e => setForm({ ...form, insta_url: e.target.value })} />
              </label>
            </div>

            <div className="dash-field">
              <span className="dash-field-label">Main Image</span>
              <label className="dash-dropzone">
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0] || null)} />
                <div className="dash-dropzone-inner">
                  <svg viewBox="0 0 24 24" className="dash-dz-icon" aria-hidden="true"><path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                  <span className="dash-dz-title">{imageFile ? imageFile.name : 'Click or drop an image'}</span>
                  <span className="dash-dz-sub">PNG, JPG, WEBP</span>
                </div>
              </label>
              {form.image && !imageFile && (
                <div className="dash-current-img">
                  <img src={form.image} alt="current" />
                  <span>Current main image — upload to replace</span>
                </div>
              )}
            </div>

            <div className="dash-field">
              <span className="dash-field-label">Gallery Media <small>(shown in bottom row of property page)</small></span>
              <label className="dash-dropzone">
                <input type="file" accept="image/*,video/*" multiple onChange={e => setGalleryFiles(Array.from(e.target.files))} />
                <div className="dash-dropzone-inner">
                  <svg viewBox="0 0 24 24" className="dash-dz-icon" aria-hidden="true"><path d="M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5" /><circle cx="9" cy="9" r="1.5" /></svg>
                  <span className="dash-dz-title">{galleryFiles.length > 0 ? `${galleryFiles.length} file(s) selected` : 'Click or drop multiple images / videos'}</span>
                  <span className="dash-dz-sub">Add several at once · images &amp; videos</span>
                </div>
              </label>
              {galleryFiles.length > 0 && (
                <div className="dash-newfiles">
                  {galleryFiles.map((f, i) => (
                    <span className="dash-newfile-chip" key={i}>{f.type.startsWith('video') ? '🎬' : '🖼'} {f.name}</span>
                  ))}
                </div>
              )}
            </div>

            {form.gallery && form.gallery.length > 0 && (
              <div className="dash-gallery-thumbs">
                <span className="dash-thumbs-label">Current gallery</span>
                <div className="dash-thumbs-grid">
                  {form.gallery.map((url) => (
                    <div className="dash-thumb" key={url}>
                      {/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url)
                        ? <video src={url} muted />
                        : <img src={url} alt="gallery" />}
                      <button type="button" className="dash-thumb-remove" onClick={() => removeExistingGalleryImage(url)} aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="dash-field">
              <span className="dash-field-label">Document Images <small>(shown below the gallery on the property page)</small></span>
              <label className="dash-dropzone">
                <input type="file" accept="image/*" multiple onChange={e => setDocumentFiles(Array.from(e.target.files))} />
                <div className="dash-dropzone-inner">
                  <svg viewBox="0 0 24 24" className="dash-dz-icon" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5" /></svg>
                  <span className="dash-dz-title">{documentFiles.length > 0 ? `${documentFiles.length} file(s) selected` : 'Click or drop document images'}</span>
                  <span className="dash-dz-sub">Khata, RTC, survey sketch, approvals…</span>
                </div>
              </label>
              {documentFiles.length > 0 && (
                <div className="dash-newfiles">
                  {documentFiles.map((f, i) => (
                    <span className="dash-newfile-chip" key={i}>📄 {f.name}</span>
                  ))}
                </div>
              )}
            </div>

            {form.documents && form.documents.length > 0 && (
              <div className="dash-gallery-thumbs">
                <span className="dash-thumbs-label">Current documents</span>
                <div className="dash-thumbs-grid">
                  {form.documents.map((url) => (
                    <div className="dash-thumb" key={url}>
                      <img src={url} alt="document" />
                      <button type="button" className="dash-thumb-remove" onClick={() => removeExistingDocument(url)} aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="dash-form-actions">
              <button className="dash-btn dash-btn-primary" type="submit" disabled={uploading}>
                {uploading ? 'Saving…' : (editingId ? 'Save Changes' : 'Add Property')}
              </button>
              {editingId && (
                <button className="dash-btn dash-btn-ghost" type="button" onClick={resetForm} disabled={uploading}>Cancel</button>
              )}
            </div>
          </form>
        </section>

        {/* LIST PANEL */}
        <section className="dash-panel dash-list-panel">
          <h2>Your Properties</h2>
          {properties.length === 0 ? (
            <p className="dash-empty">No properties yet. Add your first listing using the form.</p>
          ) : (
            <div className="dash-prop-list">
              {properties.map(p => (
                <div className={`dash-prop-row${editingId === p.id ? ' editing' : ''}`} key={p.id}>
                  <div className="dash-prop-thumb">
                    {p.image ? <img src={p.image} alt={p.title} /> : <div className="dash-prop-noimg">No image</div>}
                  </div>
                  <div className="dash-prop-info">
                    <h3>{p.title}</h3>
                    <div className="dash-prop-meta">
                      <span className="dash-tag">{p.type}</span>
                      {p.city && <span className="dash-tag dash-tag-city">{p.city}</span>}
                      <span>{p.size}</span>
                      <span className="dash-price">{p.price}</span>
                    </div>
                    {Array.isArray(p.gallery) && p.gallery.length > 0 && (
                      <span className="dash-gallery-count">{p.gallery.length} gallery image(s)</span>
                    )}
                  </div>
                  <div className="dash-prop-actions">
                    <button className="dash-btn dash-btn-sm" onClick={() => startEdit(p)}>Edit</button>
                    <button className="dash-btn dash-btn-sm dash-btn-danger" onClick={() => handleDelete(p)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
