import importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('guard',pathlib.Path(__file__).with_name('pro_teacher_evidence_only.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GuardTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.home=pathlib.Path(self.tmp.name);(self.home/'hooks').mkdir();self.target='00000000-0000-0000-0000-000000000000'
 def check(self,name,args,**extra):return m.deny_reason(dict(tool_name=name,tool_input=args,**extra),self.home)
 def test_role_and_legacy_actor(self):
  self.assertTrue(self.check('exec_command',{},agent_type='pro_teacher'))
  (self.home/'hooks/teacher-protected-handles.json').write_text(json.dumps([self.target]))
  self.assertTrue(self.check('exec_command',{},session_id=self.target));self.assertIsNone(self.check('exec_command',{}))
 def test_spawn(self):
  self.assertTrue(self.check('spawn_agent',dict(fork_context=True,model='chatgpt-web/pro')))
  self.assertTrue(self.check('spawn_agent',dict(fork_context=False,model='chatgpt-web/pro')))
  self.assertIsNone(self.check('spawn_agent',dict(agent_type='pro_teacher',fork_context=False,message='packet')))
  self.assertTrue(self.check('spawn_agent',dict(agent_type='pro_teacher',fork_context=False,message='中'*5334)))
 def test_pending_and_completed(self):
  folder=self.home/'sessions/2026/09/12';folder.mkdir(parents=True);p=folder/('rollout-date-'+self.target+'.jsonl')
  meta={'payload':{'source':{'subagent':{'thread_spawn':{'agent_role':'pro_teacher'}}}}}
  p.write_text(json.dumps(meta)+'\n'+json.dumps({'payload':{'type':'task_started'}})+'\n')
  self.assertTrue(self.check('send_input',dict(target=self.target,interrupt=True)))
  self.assertIsNone(self.check('send_input',dict(target=self.target,interrupt=False)))
  self.assertTrue(self.check('close_agent',dict(target=self.target)))
  with p.open('a') as f:f.write(json.dumps({'payload':{'type':'task_complete'}})+'\n')
  self.assertIsNone(self.check('close_agent',dict(target=self.target)))
  with p.open('a') as f:f.write(json.dumps({'payload':{'type':'task_started'}})+'\n')
  self.assertTrue(self.check('close_agent',dict(target=self.target)))
 def test_live_web_output_scope(self):
  (self.home/'hooks/web-bounded-output-handles.json').write_text(json.dumps([self.target]))
  self.assertTrue(self.check('exec_command',dict(max_output_tokens=28000),session_id=self.target))
  self.assertIsNone(self.check('exec_command',dict(max_output_tokens=28000),session_id='native'))
  self.assertIsNone(self.check('exec_command',dict(max_output_tokens=2000),session_id=self.target))
 def test_unrelated_worker(self):self.assertIsNone(self.check('send_input',dict(target='worker',interrupt=True)))
if __name__=='__main__':unittest.main()
