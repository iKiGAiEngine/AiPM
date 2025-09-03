import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CMiCLine {
  costCode: string;
  A: number; B: number; C: number; currentPeriodCost: number;
  D_int: number; E_ext: number; F_adj: number;
  G_ctc: number; H_ctc_unposted: number; I_cost_fcst: number;
  J_rev_budget: number; K_unposted_rev: number; L_unposted_rev_adj: number;
  M_rev_fcst: number; N_gain_loss: number;
}

interface ForecastingData {
  lines: CMiCLine[];
  totals: CMiCLine;
  headers: string[];
  includePending: boolean;
  projectId: string;
  project: {
    id: string;
    name: string;
    status: string;
  };
}

interface VerificationCheck {
  label: string;
  ok: boolean;
}

export default function ContractForecastingCMiC() {
  const { projectId } = useParams<{ projectId: string }>();
  const [includePending, setIncludePending] = useState(true);
  const [showVerification, setShowVerification] = useState(false);

  const { data: forecastData, isLoading } = useQuery<ForecastingData>({
    queryKey: ['/api/reporting/contract-forecasting', projectId, includePending],
    enabled: !!projectId,
  });

  const { data: verificationData } = useQuery<ForecastingData & { checks: VerificationCheck[] }>({
    queryKey: ['/api/reporting/contract-forecasting', projectId, 'verify', includePending],
    queryFn: () => fetch(`/api/reporting/contract-forecasting/${projectId}/verify?include_pending=${includePending}`).then(res => res.json()),
    enabled: !!projectId && showVerification,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const exportCSV = () => {
    window.open(`/api/reporting/contract-forecasting/${projectId}/export.csv?include_pending=${includePending}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!forecastData) {
    return (
      <div className="text-center text-gray-500 mt-8">
        No forecasting data available for this project.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract Forecasting (CMiC)</h1>
            <p className="text-gray-600">{forecastData.project.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-pending"
                checked={includePending}
                onCheckedChange={setIncludePending}
              />
              <Label htmlFor="include-pending">Include Pending COs</Label>
            </div>
            <Button
              variant={showVerification ? "default" : "outline"}
              onClick={() => setShowVerification(!showVerification)}
            >
              {showVerification ? "Hide Verification" : "Verify Mapping"}
            </Button>
            <Button onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          CMiC-style contract forecasting with A…N calculations and current period cost tracking
        </p>
      </div>

      {/* Verification Panel */}
      {showVerification && verificationData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Formula Verification
              <span className="text-sm font-normal text-gray-600">
                ({verificationData.checks?.filter(c => c.ok).length} / {verificationData.checks?.length} checks passed)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {verificationData.checks?.map((check, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {check.ok ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className={check.ok ? "text-green-800" : "text-red-800"}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Forecasting Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-100 z-10 min-w-[200px]">
                  Cost Code/Category
                </th>
                {forecastData.headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-2 py-3 text-center font-semibold text-gray-900 text-xs min-w-[100px] border-l border-gray-200"
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', minHeight: '150px' }}
                  >
                    <div className="whitespace-pre-line leading-tight">
                      {header}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecastData.lines.map((line, index) => (
                <tr key={index} className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                    {line.costCode}
                  </td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.A)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.B)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.C)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.currentPeriodCost)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.D_int)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.E_ext)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.F_adj)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.G_ctc)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.H_ctc_unposted)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono font-semibold">{formatCurrency(line.I_cost_fcst)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.J_rev_budget)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.K_unposted_rev)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono">{formatCurrency(line.L_unposted_rev_adj)}</td>
                  <td className="px-2 py-3 text-right text-sm font-mono font-semibold">{formatCurrency(line.M_rev_fcst)}</td>
                  <td className={`px-2 py-3 text-right text-sm font-mono font-semibold ${
                    line.N_gain_loss > 0 ? 'text-green-600' : line.N_gain_loss < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {formatCurrency(line.N_gain_loss)}
                  </td>
                </tr>
              ))}
              
              {/* Totals Row */}
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-4 py-3 font-bold text-gray-900 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                  TOTALS
                </td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.A)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.B)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.C)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.currentPeriodCost)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.D_int)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.E_ext)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.F_adj)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.G_ctc)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.H_ctc_unposted)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold text-lg">{formatCurrency(forecastData.totals.I_cost_fcst)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.J_rev_budget)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.K_unposted_rev)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold">{formatCurrency(forecastData.totals.L_unposted_rev_adj)}</td>
                <td className="px-2 py-3 text-right text-sm font-mono font-bold text-lg">{formatCurrency(forecastData.totals.M_rev_fcst)}</td>
                <td className={`px-2 py-3 text-right text-sm font-mono font-bold text-lg ${
                  forecastData.totals.N_gain_loss > 0 ? 'text-green-600' : forecastData.totals.N_gain_loss < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {formatCurrency(forecastData.totals.N_gain_loss)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Formula Legend */}
      <Card>
        <CardHeader>
          <CardTitle>CMiC Formula Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-1">
              <div><strong>A:</strong> Original Budget + Posted PCIs</div>
              <div><strong>B:</strong> C - SCOs Issued On Unposted PCI/OCO</div>
              <div><strong>C:</strong> Committed $ + $ Spent Outside Commitment</div>
              <div><strong>G:</strong> max(A - C, 0), if A &lt; B then 0</div>
              <div><strong>I:</strong> C + G + H (Cost Forecast)</div>
            </div>
            <div className="space-y-1">
              <div><strong>D:</strong> Unposted Internal PCI Cost Budget</div>
              <div><strong>E:</strong> Unposted External PCI Cost Budget</div>
              <div><strong>F:</strong> D + E (unless overridden)</div>
              <div><strong>H:</strong> F - Advanced SCOs (≥0)</div>
              <div><strong>M:</strong> J + L (Revenue Forecast)</div>
            </div>
            <div className="space-y-1">
              <div><strong>J:</strong> Original Revenue Budget + Posted PCIs</div>
              <div><strong>K:</strong> Unposted PCI Revenue Budget</div>
              <div><strong>L:</strong> K (unless overridden)</div>
              <div><strong>N:</strong> M - I (Projected Gain/Loss)</div>
              <div><strong>Current Period:</strong> Cost posted this period</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}