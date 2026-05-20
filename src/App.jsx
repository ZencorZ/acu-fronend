import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import axios from 'axios';
import AdminPanel from './components/AdminPanel';
import RulesPage from './pages/RulesPage';

// ========== КОНФИГУРАЦИЯ API ==========
// Базовый URL для API запросов
const API_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({
    baseURL: `${API_URL}/api`,
    timeout: 10000
});

function App() {
    const [serverStatus, setServerStatus] = useState({ online: false, players: 0 });
    const [whitelistForm, setWhitelistForm] = useState({ 
        username: '', 
        reason: '', 
        createExperience: '',
        discordTag: ''
    });
    const [agreeRules, setAgreeRules] = useState(false);
    const [formStatus, setFormStatus] = useState({ show: false, message: '', type: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
    const [userApplications, setUserApplications] = useState([]);
    const [showUserApplications, setShowUserApplications] = useState(false);
    const [syncStatus, setSyncStatus] = useState({ syncing: false, lastSync: null });

    // Получение UUID из Mojang API
    const fetchUUIDFromMojang = async (username) => {
        try {
            const response = await fetch(`https://api.mojang.com/users/profiles/minecraft/${username}`, {
                headers: { 'User-Agent': 'AssociationCreateUnits/1.0' }
            });
            if (!response.ok) return null;
            const data = await response.json();
            let uuid = data.id;
            if (uuid && uuid.length === 32 && !uuid.includes('-')) {
                uuid = `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20)}`;
            }
            return uuid;
        } catch { return null; }
    };

    useEffect(() => {
        const fetchServerStatus = async () => {
            try {
                const response = await api.get('/server-status');
                setServerStatus(response.data);
            } catch (error) {
                console.error('Ошибка загрузки статуса:', error);
            }
        };
        fetchServerStatus();
        const interval = setInterval(fetchServerStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        if (adminToken) setIsAdminLoggedIn(true);
        loadUserApplications();
        syncApplicationsStatus();
        const syncInterval = setInterval(syncApplicationsStatus, 30000);
        return () => clearInterval(syncInterval);
    }, []);

    const loadUserApplications = () => {
        const saved = localStorage.getItem('acu_user_applications');
        if (saved) try { setUserApplications(JSON.parse(saved)); } catch (e) {}
    };

    const saveApplicationToLocal = (application) => {
        const updated = [application, ...userApplications];
        setUserApplications(updated);
        localStorage.setItem('acu_user_applications', JSON.stringify(updated));
    };

    const syncApplicationsStatus = async () => {
        if (userApplications.length === 0) {
            setSyncStatus({ syncing: false, lastSync: new Date() });
            return;
        }
        setSyncStatus(prev => ({ ...prev, syncing: true }));
        try {
            const token = localStorage.getItem('adminToken');
            const headers = token ? { 'Authorization': token } : {};
            const response = await api.get('/admin/whitelist', { headers });
            const serverApps = response.data;
            let updated = false;
            let newApps = [...userApplications];
            for (const localApp of userApplications) {
                const serverApp = serverApps.find(sa => sa.id === localApp.id);
                if (serverApp && localApp.status !== serverApp.status) {
                    const index = newApps.findIndex(a => a.id === localApp.id);
                    if (index !== -1) {
                        newApps[index] = { ...newApps[index], status: serverApp.status, updatedAt: new Date().toISOString() };
                        updated = true;
                    }
                } else if (!serverApp) {
                    newApps = newApps.filter(a => a.id !== localApp.id);
                    updated = true;
                }
            }
            if (updated) {
                setUserApplications(newApps);
                localStorage.setItem('acu_user_applications', JSON.stringify(newApps));
                if (showUserApplications) {
                    setShowUserApplications(false);
                    setTimeout(() => setShowUserApplications(true), 100);
                }
            }
            setSyncStatus({ syncing: false, lastSync: new Date() });
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
            setSyncStatus({ syncing: false, lastSync: new Date() });
        }
    };

    const handleOpenUserApplications = async () => {
        setShowUserApplications(true);
        await syncApplicationsStatus();
    };

    const handleWhitelistSubmit = async (e) => {
        e.preventDefault();
        
        if (!whitelistForm.username.trim()) {
            setFormStatus({ show: true, message: 'Введите ваш никнейм', type: 'error' });
            setTimeout(() => setFormStatus({ show: false, message: '', type: '' }), 3000);
            return;
        }
        
        if (!whitelistForm.discordTag.trim()) {
            setFormStatus({ show: true, message: 'Введите ваш Discord ник', type: 'error' });
            setTimeout(() => setFormStatus({ show: false, message: '', type: '' }), 3000);
            return;
        }
        
        if (!agreeRules) {
            setFormStatus({ show: true, message: 'Подтвердите согласие с правилами', type: 'error' });
            setTimeout(() => setFormStatus({ show: false, message: '', type: '' }), 3000);
            return;
        }
        
        setIsSubmitting(true);
        try {
            const playerUUID = await fetchUUIDFromMojang(whitelistForm.username);
            
            const response = await api.post('/whitelist', {
                username: whitelistForm.username,
                uuid: playerUUID,
                reason: whitelistForm.reason,
                createExperience: whitelistForm.createExperience,
                discordTag: whitelistForm.discordTag
            });
            
            const newApplication = {
                id: response.data.application.id,
                username: whitelistForm.username,
                reason: whitelistForm.reason,
                createExperience: whitelistForm.createExperience,
                discordTag: whitelistForm.discordTag,
                status: response.data.application.status,
                createdAt: new Date().toISOString(),
                autoApproved: response.data.autoApproved
            };
            
            saveApplicationToLocal(newApplication);
            setFormStatus({ show: true, message: response.data.message, type: 'success' });
            setWhitelistForm({ username: '', reason: '', createExperience: '', discordTag: '' });
            setAgreeRules(false);
            setTimeout(() => syncApplicationsStatus(), 1000);
        } catch (error) {
            const message = error.response?.data?.error || 'Ошибка отправки заявки';
            setFormStatus({ show: true, message, type: 'error' });
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setFormStatus({ show: false, message: '', type: '' }), 4000);
        }
    };

    const copyIP = () => {
        navigator.clipboard.writeText('play.association-create-units.com');
        alert('IP скопирован!');
    };

    const handleAdminLogout = () => {
        localStorage.removeItem('adminToken');
        setIsAdminLoggedIn(false);
        setShowAdminPanel(false);
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'pending': return '⏳ На рассмотрении';
            case 'approved': return '✅ Одобрено';
            case 'rejected': return '❌ Отклонено';
            default: return status;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return '#ffa500';
            case 'approved': return '#00ff00';
            case 'rejected': return '#ff6b6b';
            default: return '#888';
        }
    };

    const getLastSyncTime = () => {
        if (!syncStatus.lastSync) return 'никогда';
        const diff = Math.floor((new Date() - new Date(syncStatus.lastSync)) / 1000);
        if (diff < 60) return `${diff} сек назад`;
        if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
        return `${Math.floor(diff / 3600)} ч назад`;
    };

    return (
        <div className="app">
            <nav className="navbar">
                <div className="nav-container">
                    <Link to="/" className="logo">
                        <span className="logo-icon">⚔️</span>
                        <span>Association Create Units</span>
                    </Link>
                    <ul className="nav-menu">
                        <li><Link to="/">Главная</Link></li>
                        <li><Link to="/whitelist">Вайтлист</Link></li>
                        <li><Link to="/rules">Правила</Link></li>
                        {userApplications.length > 0 && (
                            <li><button className="my-applications-btn" onClick={handleOpenUserApplications}>📋 Мои заявки ({userApplications.length}){syncStatus.syncing && <span className="sync-spinner"> ⟳</span>}</button></li>
                        )}
                        {!isAdminLoggedIn ? (
                            <li><button onClick={() => setShowAdminPanel(true)} className="admin-btn">Админ</button></li>
                        ) : (
                            <li><button onClick={handleAdminLogout} className="admin-btn logout">Выйти</button></li>
                        )}
                    </ul>
                </div>
            </nav>

            {showAdminPanel && !isAdminLoggedIn && (
                <AdminPanel onClose={() => setShowAdminPanel(false)} onLogin={() => { setIsAdminLoggedIn(true); setShowAdminPanel(false); }} />
            )}
            {isAdminLoggedIn && (
                <div className="admin-badge"><span>🔐 Режим администратора</span><button onClick={() => setShowAdminPanel(true)}>Открыть панель</button></div>
            )}
            {showAdminPanel && isAdminLoggedIn && (
                <AdminPanel onClose={() => setShowAdminPanel(false)} isLoggedIn={true} onLogout={handleAdminLogout} />
            )}

            {showUserApplications && (
                <div className="user-applications-modal" onClick={() => setShowUserApplications(false)}>
                    <div className="user-applications-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header"><h3>📋 Мои заявки</h3><button className="close-modal" onClick={() => setShowUserApplications(false)}>✕</button></div>
                        <div className="modal-info">
                            <div className="sync-info">
                                <div className="sync-status-row"><span className={`sync-icon ${syncStatus.syncing ? 'spinning' : ''}`}>🔄</span><span>Авто-обновление каждые 30 сек</span></div>
                                <button className="manual-sync-btn" onClick={() => syncApplicationsStatus()} disabled={syncStatus.syncing}>{syncStatus.syncing ? '⏳ Синхронизация...' : '🔄 Обновить'}</button>
                            </div>
                            <div className="last-sync">Последнее обновление: {getLastSyncTime()}</div>
                        </div>
                        <div className="applications-list-user">
                            {userApplications.length === 0 ? <div className="no-applications">Нет заявок</div> : userApplications.map(app => (
                                <div key={app.id} className="user-application-card" style={{ borderLeftColor: getStatusColor(app.status) }}>
                                    <div className="app-header"><span className="app-username">🎮 {app.username}</span><span className="app-status" style={{ color: getStatusColor(app.status) }}>{getStatusText(app.status)}</span></div>
                                    <div className="app-details-user">
                                        <div><strong>Discord:</strong> {app.discordTag || 'Не указан'}</div>
                                        {app.createExperience && <div><strong>Опыт Create:</strong> {app.createExperience}</div>}
                                    </div>
                                    {app.reason && <div className="app-reason-user"><strong>Причина:</strong><p>{app.reason}</p></div>}
                                    <div className="app-date">📅 {new Date(app.createdAt).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                        {userApplications.length > 0 && (
                            <div className="modal-footer">
                                <button className="clear-applications-btn" onClick={() => { if (window.confirm('Очистить историю заявок?')) { localStorage.removeItem('acu_user_applications'); setUserApplications([]); setShowUserApplications(false); } }}>🗑️ Очистить историю</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Routes>
                <Route path="/" element={
                    <section id="home" className="hero">
                        <div className="hero-content">
                            <div className="acu-main">
                                <div className="acu-glowing-icon">⚔️</div>
                                <h1 className="acu-title">
                                    <span className="acu-acronym">ACU</span>
                                    <span className="acu-full">Association Create Units</span>
                                </h1>
                            </div>
                            <div className="hero-divider"><span className="divider-line"></span><span className="divider-icon">✦</span><span className="divider-line"></span></div>
                            <p className="hero-slogan">«Объединяем, чтобы создавать»</p>
                            <div className="slogan-accent"></div>
                            <div className="server-info">
                                <div className="status"><span className={`dot ${serverStatus.online ? 'online' : ''}`}></span><span>{serverStatus.online ? `Онлайн: ${serverStatus.players}/${serverStatus.maxPlayers}` : 'Сервер оффлайн'}</span></div>
                                <div className="ip">IP: play.association-create-units.com</div>
                                <button onClick={copyIP} className="copy-btn">📋 Скопировать IP</button>
                            </div>
                        </div>
                        <div className="hero-bg-elements"><div className="bg-circle bg-circle-1"></div><div className="bg-circle bg-circle-2"></div><div className="bg-circle bg-circle-3"></div></div>
                    </section>
                } />
                <Route path="/rules" element={<RulesPage />} />
                <Route path="/whitelist" element={
                    <section id="whitelist" className="whitelist-section">
                        <div className="container">
                            <h2>Заявка на добавление в вайтлист</h2>
                            {userApplications.length > 0 && (
                                <div className="existing-applications"><div className="existing-header" onClick={handleOpenUserApplications}><span>📋 У вас есть {userApplications.length} заявка</span><button className="view-applications-btn">Посмотреть</button></div></div>
                            )}
                            <form onSubmit={handleWhitelistSubmit} className="whitelist-form">
                                <div className="form-group">
                                    <label>Ник Minecraft <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        value={whitelistForm.username}
                                        onChange={(e) => setWhitelistForm({ ...whitelistForm, username: e.target.value })}
                                        required 
                                        placeholder="Ваш игровой никнейм"
                                        disabled={isSubmitting}
                                    />
                                    <small className="form-hint">UUID будет получен автоматически</small>
                                </div>
                                
                                <div className="form-group">
                                    <label>Discord ник <span className="required">*</span></label>
                                    <input 
                                        type="text" 
                                        value={whitelistForm.discordTag}
                                        onChange={(e) => setWhitelistForm({ ...whitelistForm, discordTag: e.target.value })}
                                        required 
                                        placeholder="Ваш Discord ник"
                                        disabled={isSubmitting}
                                    />
                                    <small className="form-hint">Для связи с вами по вопросам заявки</small>
                                </div>
                                
                                <div className="form-group">
                                    <label>Опыт игры с модом Create</label>
                                    <select 
                                        value={whitelistForm.createExperience}
                                        onChange={(e) => setWhitelistForm({ ...whitelistForm, createExperience: e.target.value })}
                                        disabled={isSubmitting}
                                        className="create-select"
                                    >
                                        <option value="">Выберите уровень опыта</option>
                                        <option value="Новичок">🔰 Новичок — только начинаю знакомиться с модом</option>
                                        <option value="Любитель">⚙️ Любитель — базовые механизмы и понимание</option>
                                        <option value="Опытный">🏭 Опытный — уверенно строю механизмы и фермы</option>
                                        <option value="Эксперт">🔧 Эксперт — знаю все нюансы, люблю автоматизацию</option>
                                        <option value="Мастер">💎 Мастер — создаю сложные системы, готов помогать другим</option>
                                    </select>
                                    <small className="form-hint">Не обязательно, но поможет нам узнать вас лучше</small>
                                </div>
                                
                                <div className="form-group">
                                    <label>Почему хотите играть на сервере?</label>
                                    <textarea 
                                        value={whitelistForm.reason}
                                        onChange={(e) => setWhitelistForm({ ...whitelistForm, reason: e.target.value })}
                                        rows="3" 
                                        placeholder="Расскажите о себе..."
                                        disabled={isSubmitting}
                                    ></textarea>
                                </div>
                                
                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input 
                                            type="checkbox" 
                                            checked={agreeRules}
                                            onChange={(e) => setAgreeRules(e.target.checked)}
                                            required
                                            disabled={isSubmitting}
                                        />
                                        Я прочитал и согласен с <Link to="/rules">правилами сервера</Link>
                                    </label>
                                </div>
                                
                                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                                    {isSubmitting ? 'Отправка...' : '📝 Отправить заявку'}
                                </button>
                            </form>
                            {formStatus.show && (
                                <div className={`status-message ${formStatus.type}`}>
                                    {formStatus.message}
                                </div>
                            )}
                        </div>
                    </section>
                } />
            </Routes>
            <footer><p>© 2024 Association Create Units — объединяем, чтобы создавать</p></footer>
        </div>
    );
}

export default App;