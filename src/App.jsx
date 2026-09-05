import { useEffect, useRef, useState, useCallback, useMemo, Fragment } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { useProperties } from './context/PropertyContext'
import { safeUrl } from './utils/safeUrl'
import { withLatLng } from './utils/coords'
import { supabase } from './supabaseClient'
import Dashboard, { PROPERTY_TYPES } from './pages/Dashboard'
import PropertyDetails from './pages/PropertyDetails'
import AboutPage from './pages/About'
import PaperworkPage from './pages/Paperwork'

import logoImg from './assets/SSLogo.png'
import heroImg1 from './assets/hero-img1.png'
import heroImg2 from './assets/hero-img2.png'
import heroImg3 from './assets/hero-img3.png'

gsap.registerPlugin(ScrollTrigger)

// Client WhatsApp number (international format, no symbols) for wa.me links.
export const WHATSAPP_NUMBER = '919886048471'

// Karnataka RERA agent registration number. Required disclosure — keep it here
// as the single source so every page shows the same value.
export const RERA_NUMBER = 'PRM/KA/RERA/1268/378/AG/260713/007497'

const LOGO = logoImg
const SLIDES = [
  { desk: heroImg1, mob: heroImg1, alt: 'Luxury apartment building exterior' },
  { desk: heroImg2, mob: heroImg2, alt: 'Modern real estate property' },
  { desk: heroImg3, mob: heroImg3, alt: 'Premium investment property' },
]
import main2Img from '../images/main2.jpeg'
import slide2Img from '../images/slide2.png'
import profilePhotoImg from '../images/profile-photo.jpeg'

const IMAGES = {
  main1: profilePhotoImg,
  main2: main2Img,
  slide2: slide2Img,
}

/* Smooth-scroll to a section, navigating home first if needed */
function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  const header = document.getElementById('header')
  const offset = (header?.getBoundingClientRect().height ?? 0) + 16
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}

function useScrollToSection() {
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback((id) => {
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } })
    } else {
      scrollToId(id)
    }
  }, [navigate, location.pathname])
}

/* =================== LOADER =================== */
function Loader({ onDone }) {
  const ref = useRef()
  useEffect(() => {
    const t1 = setTimeout(() => ref.current?.classList.add('animate'), 2000)
    const t2 = setTimeout(() => {
      document.body.classList.remove('is-loader')
      ref.current?.classList.add('hide')
      onDone()
    }, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])
  return (
    <div className="loader" ref={ref}>
      <div className="loader-bg">
        <img src={LOGO} alt="SiteSeeing Realty" className="loader-logo" />
      </div>
    </div>
  )
}

/* =================== HEADER =================== */
function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const scrollToSection = useScrollToSection()
  const handleContact = (e) => { e.preventDefault(); setMobileOpen(false); scrollToSection('join-section') }
  return (
    <header className="header" id="header">
      <div className="holder">
        <div className="header-block">
          <button className={`mob-nav-icon${mobileOpen ? ' active' : ''}`} onClick={() => setMobileOpen(v => !v)}>
            <span className="mob-nav-block" />
          </button>
          <div className="header-logo"><Link to="/"><img src={LOGO} alt="SiteSeeing Logo" /></Link></div>
          <nav className={`header-nav${mobileOpen ? ' vis' : ''}`} id="header-nav">
            <ul className="header-nav-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About</Link></li>
              <li><Link to="/paperwork">Paperwork</Link></li>
            </ul>
            <ul className="header-nav-list">
              <li><a href="/#join-section" onClick={handleContact}>Contact</a></li>
            </ul>
            <a href="tel:+9494168733" className="header-phone">+919886048471</a>
          </nav>
        </div>
      </div>
    </header>
  )
}

/* =================== BANNER =================== */
function Banner({ visible }) {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef()
  const scrollToSection = useScrollToSection()

  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 5000)
    return () => clearInterval(timerRef.current)
  }, [visible])

  const prev = () => setIdx(i => (i - 1 + SLIDES.length) % SLIDES.length)
  const next = () => setIdx(i => (i + 1) % SLIDES.length)

  return (
    <section className="banner" id="banner">
      <div className="banner-slider" id="banner-slider">
        {SLIDES.map((s, i) => (
          <div key={i} className={`banner-slide banner-float${i === idx ? ' active' : ''}`}>
            <picture>
              <source srcSet={s.mob} media="(max-width: 768px)" />
              <img src={s.desk} alt={s.alt} />
            </picture>
          </div>
        ))}
      </div>
      <div className="banner-overlay" />
      <div className="banner-text-shade" />
      <div className="banner-main">
        <div className="holder">
          <div className={`banner-block${visible ? ' vis' : ''}`} id="banner-block">
            <h1 className="banner-h1">Find the perfect plot <br />that matches your needs</h1>
            <div className="banner-buttons">
              <a href="#properties" className="button" id="cta-explore" onClick={(e) => { e.preventDefault(); scrollToSection('properties') }}>Explore Properties</a>
              <a href="#join-section" className="button" id="cta-contact" onClick={(e) => { e.preventDefault(); scrollToSection('join-section') }}>Contact Us</a>
            </div>
            <div className="banner-rera">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3.5v5.8c0 4.6-3.4 8.9-8 10.2-4.6-1.3-8-5.6-8-10.2V5.5L12 2z" /><path className="rera-tick" d="M8.5 12.2l2.4 2.4 4.6-4.9" /></svg>
              <span>KA RERA Reg. No: <strong>{RERA_NUMBER}</strong></span>
            </div>
          </div>
        </div>
      </div>
      <div className="slider-arrows">
        <button className="slider-arrow prev" onClick={prev} aria-label="Previous slide" />
        <button className="slider-arrow" onClick={next} aria-label="Next slide" />
      </div>
    </section>
  )
}

/* =================== SLOGAN =================== */
const SLOGAN_TEXT = "Our approach is simple: connect buyers with the right plots at the right locations, ensuring transparency, value, and long term growth.";

function Slogan() {
  const containerRef = useRef()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let ctx = gsap.context(() => {
      const covers = el.querySelectorAll('.slogan-cover')
      covers.forEach(cover => {
        gsap.set(cover, { width: 0 })
        gsap.to(cover, {
          width: '100%', ease: 'none',
          scrollTrigger: { trigger: cover, start: 'top 70%', end: 'top 60%', scrub: true }
        })
      })
    }, el)

    return () => ctx.revert()
  }, [])

  const words = SLOGAN_TEXT.split(' ')

  return (
    <div className="slogan">
      <div className="slogan-text" id="slogan-text" ref={containerRef}>
        {words.map((word, i) => (
          <Fragment key={i}>
            <span className="slogan-word">
              {word}
              <span className="slogan-cover">{word}</span>
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/* =================== PROPERTY EXPLORER =================== */
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
))

const priceIcon = (price) => new L.DivIcon({
  className: 'price-marker',
  html: `<div class="price-pill">${escapeHtml(price)}</div>`,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
})

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true })
    } else {
      map.fitBounds(points, { padding: [50, 50], animate: true })
    }
  }, [map, points])
  return null
}

function PropertyExplorer() {
  const { properties } = useProperties()
  const [filter, setFilter] = useState('All')
  const [cityFilter, setCityFilter] = useState('All')
  const navigate = useNavigate()

  const cities = ['All', ...Array.from(new Set(properties.map(p => p.city).filter(Boolean))).sort()]
  // Treat legacy "Plot" rows as "Site" so they still surface under the renamed filter.
  const normalizeType = (t) => (t === 'Plot' ? 'Site' : t)
  const filtered = properties.filter(p =>
    (filter === 'All' || normalizeType(p.type) === filter) &&
    (cityFilter === 'All' || p.city === cityFilter)
  )
  // Only rows with usable coordinates reach the map, and the array identity is
  // kept stable so FitBounds doesn't refit on every render.
  const mappable = useMemo(() => withLatLng(filtered), [filtered])

  const openProperty = (e, id) => {
    e.preventDefault()
    const img = e.currentTarget?.closest?.('.property-card')?.querySelector('.property-img img')
    if (document.startViewTransition && img) {
      img.style.viewTransitionName = 'hero-image'
      const transition = document.startViewTransition(() => navigate(`/property/${id}`))
      transition.finished.finally(() => { img.style.viewTransitionName = '' })
    } else {
      navigate(`/property/${id}`)
    }
  }

  return (
    <section className="property-explorer" id="properties">
      <div className="holder reveal">
        <h2><div className="text-wrap"><div className="text-inner">Explore Properties</div></div></h2>
        <div className="subheading"><div className="text-wrap"><div className="text-inner">Interactive Map & Listings</div></div></div>
      </div>

      <div className="holder">
        <div className="filters">
          {['All', ...PROPERTY_TYPES].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
        {cities.length > 1 && (
          <div className="filters filters-city">
            <span className="filters-label">City</span>
            <div className="city-select-wrap">
              <select className="city-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
                {cities.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All cities' : c}</option>
                ))}
              </select>
              <span className="city-select-arrow" aria-hidden="true">▾</span>
            </div>
          </div>
        )}
        <div className="explorer-rera">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l8 3.5v5.8c0 4.6-3.4 8.9-8 10.2-4.6-1.3-8-5.6-8-10.2V5.5L12 2z" /><path className="rera-tick" d="M8.5 12.2l2.4 2.4 4.6-4.9" /></svg>
          <span>Every listing sourced by a Karnataka RERA registered agent — <strong>{RERA_NUMBER}</strong></span>
        </div>
      </div>

      <div className="map-wrap">
        <MapContainer center={[12.2958, 76.6394]} zoom={12} scrollWheelZoom={false} className="leaflet-map">
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap contributors" maxZoom={19} />
          <FitBounds points={mappable.map(m => m.position)} />
          {mappable.map(({ property: p, position }) => (
            <Marker key={p.id} position={position} icon={priceIcon(p.price)}>
              <Popup className="airbnb-popup">
                <div className="map-popup" onClick={() => openProperty({ preventDefault() {}, currentTarget: null }, p.id)} style={{ cursor: 'pointer' }}>
                  <img src={p.image} alt={p.title} />
                  <div className="map-popup-body">
                    <strong>{p.title}</strong>
                    <span className="map-popup-meta">{p.type}{p.city ? ` · ${p.city}` : ''}</span>
                    <span className="map-popup-price">{p.price}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="holder">
        <div className="property-grid">
          {filtered.map(p => (
            <div className="property-card" key={p.id}>
              <a href={`/property/${p.id}`} onClick={(e) => openProperty(e, p.id)} className="property-img" style={{display: 'block'}}>
                <img src={p.image} alt={p.title} />
              </a>
              <div className="property-info">
                <a href={`/property/${p.id}`} onClick={(e) => openProperty(e, p.id)} style={{textDecoration: 'none', color: 'inherit'}}>
                  <h3>{p.title}</h3>
                </a>
                <div className="property-meta"><span>{p.type}</span> &nbsp;|&nbsp; <span>{p.size}</span></div>
                <div className="property-price">{p.price}</div>
                <a href={safeUrl(p.maps_url) || `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="link-flash" style={{fontSize: '14px', marginTop: '10px', display: 'inline-block'}}>Open in Google Maps</a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* =================== HOME PAGE =================== */
function Home({ loaderDone }) {
  const [formSent, setFormSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [contact, setContact] = useState({ fullname: '', phone: '', message: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!contact.fullname.trim()) return
    setSubmitting(true)
    // Still record the inquiry in the dashboard (best-effort), then hand off to WhatsApp.
    await supabase.from('inquiries').insert([{
      fullname: contact.fullname.trim(),
      phone: contact.phone.trim(),
      message: contact.message.trim(),
    }])
    setSubmitting(false)

    const waText = encodeURIComponent(
      `New inquiry from SiteSeeing Realty website\n\n` +
      `Name: ${contact.fullname.trim()}\n` +
      `Phone: ${contact.phone.trim() || '-'}\n` +
      `Message: ${contact.message.trim() || '-'}`
    )
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`, '_blank', 'noopener')

    setContact({ fullname: '', phone: '', message: '' })
    setFormSent(true)
  }

  return (
    <>
      <Banner visible={loaderDone} />

      <section className="main-wrap" id="main-content">
        <div className="holder">
          {/* ABOUT */}
          <div className="about-team">
            <div className="about-team-col reveal">
              <div className="key-wrap"><div className="key" /></div>
              <h2>
                <div className="text-wrap"><div className="text-inner">About Us</div></div>
              </h2>
              <div className="subheading">
                <div className="text-wrap"><div className="text-inner">Trusted Real Estate Services in Karnataka</div></div>
              </div>
              <div className="about-team-text mob-hidden">
                We specialize in helping individuals and families find the right residential and investment plots across Karnataka. With a strong focus on transparency, clear documentation, and genuine guidance, we make the property buying process simple and reliable.
              </div>
            </div>
            <div className="about-team-col img-float">
              <img src={IMAGES.main1} alt="Real estate investment property" />
            </div>
            <div className="about-team-col">
              <div className="about-team-text">
                <span className="mob-hide">With a strong foundation in civil engineering and years of hands-on experience in infrastructure and real estate development, S. Rakesh has established a trusted name in Karnataka’s real estate and construction sector. Born and brought up in Mysore, he combines deep local knowledge with technical expertise to deliver reliable and value-driven property solutions. </span>
                <span>A Class–1 PWD Civil Contractor and a qualified Civil Engineering graduate, S. Rakesh specializes in executing layout development works with a focus on quality, planning, and long-term sustainability. His professional approach and transparent dealings have earned the confidence of clients seeking dependable guidance in property investment and development.</span>
                Backed by local market knowledge and a commitment to honest dealings, we aim to build lasting relationships with our clients while helping them make confident property decisions.
              </div>
            </div>
          </div>

          {/* SLOGAN */}
          <Slogan />

          {/* INVESTMENTS */}
          <div className="info">
            <div className="info-bg img-float">
              <picture>
                <source srcSet={IMAGES.main2} media="(max-width: 1023px)" />
                <img src={IMAGES.main2} alt="Investment property overview" />
              </picture>
            </div>
            <div className="info-top reveal">
              <h2><div className="text-wrap"><div className="text-inner">Strategic Focus on High Growth Locations</div></div></h2>
              <div className="subheading"><div className="text-wrap"><div className="text-inner">Invest with Confidence in Karnataka's Thriving Real Estate Market</div></div></div>
            </div>
            <div className="info-content">
              <div className="line-wrap line-reveal"><div className="line-dash" /></div>
              <div className="info-block">
                <div className="info-text">
                  We specialize in sourcing land opportunities in carefully selected regions with strong development potential. By focusing on quality locations and verified properties, we help our clients secure assets that offer stability today and appreciation tomorrow.
                </div>
              </div>
              <div className="info-img img-float">
                <picture>
                  <source srcSet={IMAGES.slide2} media="(max-width: 1023px)" />
                  <img src={IMAGES.slide2} alt="Multi-family real estate property" />
                </picture>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLORER */}
      <PropertyExplorer />

      {/* JOIN */}
      <section className="join" id="join-section">
        <div className="holder reveal">
          <h2><div className="text-wrap"><div className="text-inner">Contact Us</div></div></h2>
          <div className="join-form">
            <div className="key-wrap"><div className="key" /></div>
            {!formSent ? (
              <div className="formwrap" id="join-form-wrap">
                <form id="join-form" noValidate onSubmit={handleSubmit}>
                  <div className="input-box">
                    <span className="input-item"><input required type="text" name="fullname" placeholder="full name" id="input-fullname" value={contact.fullname} onChange={e => setContact({ ...contact, fullname: e.target.value })} /></span>
                    <span className="input-item"><input type="tel" name="phone" placeholder="phone" id="input-phone" value={contact.phone} onChange={e => setContact({ ...contact, phone: e.target.value })} /></span>
                    <span className="input-item input-item-full"><input type="text" name="message" placeholder="message" id="input-message" value={contact.message} onChange={e => setContact({ ...contact, message: e.target.value })} /></span>
                  </div>
                  <div className="form-button">
                    <button className="button btn-getintouch" type="submit" id="btn-submit" disabled={submitting}>{submitting ? 'Sending…' : 'Get in Touch'}</button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="thanks" id="thanks-message">
                <h2>Thanks for Enquiring!</h2>
                <div className="subheading">We will reach out to you shortly.</div>
                <a href="/" className="button" id="btn-back-home">Back to Home Page</a>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

/* =================== FLOATING WHATSAPP =================== */
function WhatsAppFab() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi, I'm interested in your properties.")}`
  return (
    <a className="wa-fab" href={href} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.74 6.4L3.2 28.8l6.58-1.72a12.74 12.74 0 0 0 6.22 1.6h.01c7.06 0 12.8-5.74 12.8-12.8s-5.75-12.68-12.81-12.68zm0 23.04h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-3.9 1.02 1.04-3.8-.25-.39a10.58 10.58 0 0 1-1.62-5.62c0-5.86 4.77-10.63 10.64-10.63 2.84 0 5.5 1.11 7.51 3.12a10.55 10.55 0 0 1 3.11 7.52c0 5.86-4.77 10.49-10.63 10.49zm5.83-7.96c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.15-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55l-.61-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.75.75.32 1.34.51 1.79.66.75.24 1.44.21 1.98.13.6-.09 1.89-.77 2.16-1.52.27-.74.27-1.38.19-1.51-.08-.13-.29-.21-.61-.37z" />
      </svg>
    </a>
  )
}

/* =================== APP =================== */
export default function App() {
  const [loaderDone, setLoaderDone] = useState(false)
  const onLoaderDone = useCallback(() => setLoaderDone(true), [])
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loaderDone) return

    let ctx = gsap.context(() => {
      // Reveal animations
      document.querySelectorAll('.reveal').forEach(el => {
        gsap.from(el, {
          scrollTrigger: {
            trigger: el, start: 'top 80%',
            onEnter: () => el.classList.add('animate'),
          }
        })
      })

      // Image float / parallax
      document.querySelectorAll('.img-float').forEach(el => {
        const img = el.querySelector('img')
        if (!img) return
        if (el.classList.contains('about-team-col')) {
          gsap.set(img, { yPercent: 0, scale: 1.15, transformOrigin: 'top center' })
          gsap.to(img, { scale: 1, ease: 'none', scrollTrigger: { trigger: img, scrub: true } })
        } else {
          gsap.set(img, { yPercent: 0 })
          gsap.to(img, { yPercent: -20, ease: 'none', scrollTrigger: { trigger: img, scrub: true } })
        }
      })

      // Line reveal
      document.querySelectorAll('.line-reveal').forEach(el => {
        const dash = el.querySelector('.line-dash')
        if (!dash) return
        gsap.to(dash, {
          ease: 'none',
          scrollTrigger: {
            trigger: el, start: 'top 40%', end: 'bottom 40%',
            onEnter: () => dash.classList.add('animate'),
          }
        })
      })
    })

    return () => ctx.revert()
  }, [loaderDone, location.pathname])

  // Scroll handling on route change: jump to a requested section, else top
  useEffect(() => {
    const targetId = location.state?.scrollTo
    if (targetId) {
      // wait a frame so the target section is rendered
      requestAnimationFrame(() => {
        setTimeout(() => scrollToId(targetId), 50)
      })
      navigate(location.pathname, { replace: true, state: {} })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, location.state, navigate])

  return (
    <>
      <Loader onDone={onLoaderDone} />
      <div id="wrapper">
        <Header />

        <Routes>
          <Route path="/" element={<Home loaderDone={loaderDone} />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/paperwork" element={<PaperworkPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/property/:id" element={<PropertyDetails />} />
        </Routes>

        {/* FOOTER */}
        <footer className="footer" id="footer">
          <div className="holder">
            <div className="footer-top">
              <div className="footer-logo"><img src={LOGO} alt="The Real Estate Fund Logo" /></div>
              <ul className="footer-nav" id="footer-nav">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/about">About</Link></li>
                <li><Link to="/paperwork">Paperwork</Link></li>
                <li><a href="/#join-section" onClick={(e) => {
                  e.preventDefault()
                  if (location.pathname !== '/') navigate('/', { state: { scrollTo: 'join-section' } })
                  else scrollToId('join-section')
                }}>Contact</a></li>
              </ul>
            </div>
            <div className="footer-text">
              <p>This information is provided for general informational purposes only and should not be considered as a legal offer, solicitation, or commitment for the sale or purchase of any property or investment. Interested buyers/investors are requested to contact us directly for complete project details, documentation, and further clarification.</p>
              <p>Disclaimer: Any forward-looking statements, project expectations, development plans, appreciation potential, or future prospects mentioned on this website are based on current market conditions, assumptions, and available information. Actual results may vary depending on market trends, government policies, approvals, and other unforeseen factors.</p>
            </div>
            <div className="footer-bottom">
              <div className="footer-copy">
                <div className="footer-rera">KA RERA Agent Reg. No: <span>{RERA_NUMBER}</span></div>
                <div className="copyright">Copyright &copy; 2026 SiteSeeing Realty&reg; All rights reserved.</div>
                <div className="privacy">
                  <a href="/privacy-policy/">Privacy Policy</a>
                  <a href="/terms-and-conditions/">Terms and Conditions</a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <WhatsAppFab />
    </>
  )
}
