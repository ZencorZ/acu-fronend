import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BuildPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';
const api = axios.create({
    baseURL: `${API_URL}/api`,
    timeout: 10000
});

function BuildPage() {
    const [build, setBuild] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBuild();
    }, []);

    const fetchBuild = async () => {
        try {
            const response = await api.get('/build');
            setBuild(response.data);
        } catch (error) {
            console.error('Ошибка загрузки сборки:', error);
            setError('Не удалось загрузить данные сборки');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="build-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Загрузка...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="build-page">
                <div className="error-container">
                    <p>⚠️ {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="build-page">
            <div className="build-header">
                <div className="build-header-content">
                    <h1>🎮 Сборка ACU</h1>
                    <p>Всё необходимое для игры на нашем сервере</p>
                </div>
            </div>

            <div className="build-info">
                <div className="info-card">
                    <div className="info-icon">📦</div>
                    <div className="info-text">
                        <h3>Версия сборки</h3>
                        <p>{build.version || '1.0.0'}</p>
                    </div>
                </div>
                <div className="info-card">
                    <div className="info-icon">⛏️</div>
                    <div className="info-text">
                        <h3>Версия Minecraft</h3>
                        <p>{build.minecraftVersion || '1.20.1'}</p>
                    </div>
                </div>
                <div className="info-card">
                    <div className="info-icon">🔧</div>
                    <div className="info-text">
                        <h3>Версия Neo Forge</h3>
                        <p>{build.forgeVersion || '47.2.0'}</p>
                    </div>
                </div>
            </div>

            <div className="build-description">
                <h2>📖 О сборке</h2>
                <p>{build.description || 'Описание сборки будет добавлено позже...'}</p>
            </div>

            <div className="download-section">
                <h2>⬇️ Скачать сборку</h2>
                <div className="download-buttons">
                    {build.curseForgeUrl && (
                        <a
                            href={build.curseForgeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="download-btn curseforge"
                        >
                            <span className="btn-icon">🔗</span>
                            CurseForge
                        </a>
                    )}
                    {build.modrinthUrl && (
                        <a
                            href={build.modrinthUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="download-btn modrinth"
                        >
                            <span className="btn-icon">📥</span>
                            Modrinth
                        </a>
                    )}
                </div>
            </div>

            <div className="mods-section">
                <h2>📋 Список модов</h2>
                <div className="mods-grid">
                    {build.mods && build.mods.map((mod) => (
                        <div key={mod.id} className="mod-card">
                            <div className="mod-icon">{mod.icon || '📦'}</div>
                            <div className="mod-info">
                                <h3>
                                    {mod.name}
                                    {mod.required && <span className="required-badge">Обязательный</span>}
                                </h3>
                                <p>{mod.description}</p>
                                <div className="mod-links">
                                    {mod.curseForgeUrl && (
                                        <a href={mod.curseForgeUrl} target="_blank" rel="noopener noreferrer" className="mod-link curseforge">
                                            CurseForge
                                        </a>
                                    )}
                                    {mod.modrinthUrl && (
                                        <a href={mod.modrinthUrl} target="_blank" rel="noopener noreferrer" className="mod-link modrinth">
                                            Modrinth
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default BuildPage;