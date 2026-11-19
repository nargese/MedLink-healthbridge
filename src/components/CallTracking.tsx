import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { callReduction } from '@/lib/metrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function CallTracking() {
  const qc = useQueryClient();
  const [clinic, setClinic] = useState('');
  const [month, setMonth] = useState('');
  const [calls, setCalls] = useState('');
  const [baseline, setBaseline] = useState('');
  const [busy, setBusy] = useState(false);
  const clinics = useQuery({ queryKey: ['call-clinics'], queryFn: async () => {
    const { data, error } = await supabase.from('cliniques').select('id,nom').order('nom');
    if (error) throw error;
    return data;
  } });
  const records = useQuery({ queryKey: ['call-records'], queryFn: async () => {
    const { data, error } = await supabase.from('appels_mensuels').select('*, cliniques(nom)').order('mois', { ascending: false });
    if (error) throw error;
    return data;
  } });
  const exportReport = async () => {
    const { error } = await supabase.rpc('log_access', { _action: 'export_stats', _cible: 'appels_mensuels' });
    if (error) return toast.error('Export refusé.');
    const rows = [['Mois', 'Clinique', 'Appels', 'Référence', 'Baisse (%)'], ...(records.data ?? []).map(r => [r.mois, r.cliniques?.nom ?? '', r.appels, r.reference_appels, callReduction(r.reference_appels, r.appels) ?? 'Non calculable'])];
    const csv = '\ufeff' + rows.map(row => row.map(value => `"${String(value).replace(/^[=+@-]/, "'").replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'medlink-synthese-appels.csv'; a.click(); URL.revokeObjectURL(url);
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic || !month || !Number.isInteger(Number(calls)) || !Number.isInteger(Number(baseline))) return toast.error('Complétez le relevé.');
    setBusy(true);
    const { error } = await supabase.from('appels_mensuels').upsert({ clinique_id: clinic, mois: month + '-01', appels: Number(calls), reference_appels: Number(baseline) }, { onConflict: 'clinique_id,mois' });
    setBusy(false);
    if (error) return toast.error('Enregistrement refusé.');
    await qc.invalidateQueries({ queryKey: ['call-records'] });
    toast.success('Relevé enregistré.');
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl">Synthèse Direction · Appels</h2><Button variant="outline" onClick={exportReport} disabled={!records.data?.length}><Download className="mr-2 h-4 w-4" />Exporter</Button></div>
    <form onSubmit={save} className="grid items-end gap-4 md:grid-cols-5">
      <div className="space-y-2"><Label>Clinique</Label><Select value={clinic} onValueChange={setClinic}><SelectTrigger aria-label="Clinique du relevé"><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{clinics.data?.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor="call-month">Mois</Label><Input id="call-month" type="month" required value={month} onChange={e => setMonth(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="call-count">Appels reçus</Label><Input id="call-count" type="number" min="0" step="1" required value={calls} onChange={e => setCalls(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="call-baseline">Appels de référence</Label><Input id="call-baseline" type="number" min="0" step="1" required value={baseline} onChange={e => setBaseline(e.target.value)} /></div>
      <Button disabled={busy}>Enregistrer le relevé</Button>
    </form>
    {records.isError && <p className="text-destructive">Les relevés ne peuvent pas être chargés.</p>}
    {records.isPending ? <p>Chargement…</p> : !records.data?.length ? <p className="text-muted-foreground">Aucun relevé d’appels.</p> : <Table><TableHeader><TableRow><TableHead>Mois</TableHead><TableHead>Clinique</TableHead><TableHead>Appels</TableHead><TableHead>Référence</TableHead><TableHead>Baisse</TableHead></TableRow></TableHeader><TableBody>{records.data.map(r => <TableRow key={r.id}><TableCell>{r.mois.slice(0, 7)}</TableCell><TableCell>{r.cliniques?.nom}</TableCell><TableCell>{r.appels}</TableCell><TableCell>{r.reference_appels}</TableCell><TableCell>{callReduction(r.reference_appels, r.appels) === null ? 'Non calculable' : `${callReduction(r.reference_appels, r.appels)} %`}</TableCell></TableRow>)}</TableBody></Table>}
  </div>;
}