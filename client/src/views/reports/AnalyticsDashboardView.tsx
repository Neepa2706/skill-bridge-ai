import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, Users, Award, Briefcase, Sparkles, ArrowRight } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import './AnalyticsDashboardView.css';

interface AnalyticsDashboardViewProps {
  onNavigate?: (view: string, data?: any) => void;
}

export const AnalyticsDashboardView: React.FC<AnalyticsDashboardViewProps> = ({ onNavigate }) => {
  const { addToast } = useNotification();
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('sb_token');
      const res = await fetch('/api/reports/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setAnalytics(json.data);
      }
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
        Aggregating cross-platform placement analytics and skill demand curves...
      </div>
    );
  }

  const {
    overallPlacementReadinessIndex = 78,
    totalEnrolledTalent = 25,
    readinessDistribution = { excellent: 10, good: 12, needsImprovement: 3 },
    departmentDistribution = [],
    skillTrends = []
  } = analytics || {};

  const totalDist =
    (readinessDistribution.excellent || 0) +
    (readinessDistribution.good || 0) +
    (readinessDistribution.needsImprovement || 0) || 1;

  const pctExcellent = Math.round(((readinessDistribution.excellent || 0) / totalDist) * 100);
  const pctGood = Math.round(((readinessDistribution.good || 0) / totalDist) * 100);
  const pctNeeds = 100 - pctExcellent - pctGood;

  return (
    <div className="analytics-dashboard-container">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '4px' }}>
            Campus Placement & Skill Demand Analytics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Macro-level student capability benchmarks, corporate hiring demand alignment, and department score curves.
          </p>
        </div>

        {onNavigate && (
          <button onClick={() => onNavigate('unified-reports')} className="btn btn-outline">
            View Printable Reports <ArrowRight size={14} />
          </button>
        )}
      </div>

      {/* Hero Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>CAMPUS READINESS INDEX</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--accent-emerald)', margin: '4px 0' }}>
            {overallPlacementReadinessIndex}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Weighted multi-disciplinary score</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL ENROLLED TALENT</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
            {totalEnrolledTalent}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active campus candidates</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>EXCELLENT BAND (&ge;80%)</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: 'var(--accent-cyan)', margin: '4px 0' }}>
            {pctExcellent}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tier-1 placement candidates</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DEVELOPMENT COHORT</div>
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#f59e0b', margin: '4px 0' }}>
            {pctNeeds}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Requiring remediation</div>
        </div>
      </div>

      {/* Cohort Readiness Distribution Bar */}
      <div className="card">
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
          Placement Readiness Distribution Breakdown
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Student readiness divided across High Tier (&ge;80%), Competitive (65-79%), and Focused Skill-Building (&lt;65%).
        </p>

        <div className="dist-bar-wrapper">
          <div className="dist-bar-segment" style={{ width: `${pctExcellent}%`, background: 'var(--accent-emerald)' }} title={`Tier 1: ${pctExcellent}%`} />
          <div className="dist-bar-segment" style={{ width: `${pctGood}%`, background: 'var(--accent-cyan)' }} title={`Competitive: ${pctGood}%`} />
          <div className="dist-bar-segment" style={{ width: `${pctNeeds}%`, background: '#f59e0b' }} title={`Remediation: ${pctNeeds}%`} />
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--accent-emerald)' }} />
            <span>Tier-1 Placement Ready (&ge;80%): <strong>{readinessDistribution.excellent} ({pctExcellent}%)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--accent-cyan)' }} />
            <span>Competitive (65-79%): <strong>{readinessDistribution.good} ({pctGood}%)</strong></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: '#f59e0b' }} />
            <span>Skill Remediation (&lt;65%): <strong>{readinessDistribution.needsImprovement} ({pctNeeds}%)</strong></span>
          </div>
        </div>
      </div>

      {/* Two column grid: Department Scores & Supply vs Demand */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Department Readiness */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Department Score Comparisons</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {departmentDistribution.map((dept: any) => (
              <div key={dept.name} style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <strong>{dept.name}</strong>
                  <span style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>{dept.avgReadiness}% Avg</span>
                </div>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill fill-emerald" style={{ width: `${dept.avgReadiness}%` }} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {dept.count} candidates in cohort
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Demand vs Student Supply */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Skill Market Demand vs Supply</h3>
            <span className="badge badge-primary">Industry Normalized</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {skillTrends.map((st: any) => (
              <div key={st.skill} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <strong>{st.skill}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Demand: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{st.demand}%</span> • Supply: <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{st.supply}%</span>
                  </span>
                </div>
                <div className="supply-demand-bar">
                  <div style={{ width: `${st.demand}%`, background: 'var(--primary)', height: '100%' }} />
                </div>
                <div className="supply-demand-bar" style={{ marginTop: '2px' }}>
                  <div style={{ width: `${st.supply}%`, background: 'var(--accent-cyan)', height: '100%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
