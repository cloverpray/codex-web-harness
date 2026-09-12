import importlib.util,json,pathlib,tempfile,unittest,os
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('snapshot',str(pathlib.Path(__file__).resolve().parent / 'research_snapshot.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class TestSnapshot(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=pathlib.Path(self.tmp.name);self.run=self.root/'runtime';self.run.mkdir();self.cp=self.root/'RESEARCH_CHECKPOINT.json'
  self.put(self.run/'RUN.json',{'run_id':'r1','qualification':{'win':.7},'holdout_start':'2025'})
  self.put(self.run/'CURRENT_STATE.json',{'run_id':'r1','trials':3,'pending':None,'contract':{'holdout_start':'2025','qualification':{'win':.7}}})
  self.put(self.cp,{'runtime_trials_completed':3,'next':'continue','direction':'direction.json','report':str(self.root/'direction.json')})
  self.put(self.root/'direction.json',{'status':'MIXED','qualification':False,'details':'not requested'})
 def put(self,p,v):p.write_text(json.dumps(v))
 def test_snapshot_readonly_and_dedup(self):
  before={p:(p.read_bytes(),p.stat().st_mtime_ns) for p in self.root.rglob('*') if p.is_file()};v=json.loads(m.collect(self.run,self.cp));self.assertEqual(v['warnings'],[]);self.assertEqual(len(v['linked_evidence']),1);self.assertEqual(v['linked_evidence'][0]['omitted_keys'],['details']);self.assertEqual(before,{p:(p.read_bytes(),p.stat().st_mtime_ns) for p in self.root.rglob('*') if p.is_file()})
 def test_budget_fails_without_truncation(self):
  with self.assertRaisesRegex(ValueError,'byte budget'):m.collect(self.run,self.cp,20)
 def test_identity(self):
  self.put(self.run/'CURRENT_STATE.json',{'run_id':'wrong'})
  with self.assertRaisesRegex(ValueError,'identities'):m.collect(self.run,self.cp)
 def test_stale_state(self):
  ledger=self.run/'TRIALS.jsonl';ledger.write_text('{}\n');s=(self.run/'CURRENT_STATE.json').stat();os.utime(ledger,ns=(s.st_mtime_ns+1000000,s.st_mtime_ns+1000000));v=json.loads(m.collect(self.run,self.cp));self.assertTrue(any('newer' in x for x in v['warnings']))
 def test_missing_and_escape_are_explicit(self):
  self.put(self.cp,{'report':'../outside.json','direction':'missing.json'});v=json.loads(m.collect(self.run,self.cp));self.assertEqual(len(v['warnings']),2)
 def test_change_during_collection_rejected(self):
  original=m.stamp;calls=0
  def changing(p):
   nonlocal calls
   value=original(p)
   if p==self.cp:
    calls+=1
    if calls>=3:return (0,0,0,0,0)
   return value
  with patch.object(m,'stamp',changing):
   with self.assertRaisesRegex(ValueError,'changed during collection'):m.collect(self.run,self.cp)
if __name__=='__main__':unittest.main()
