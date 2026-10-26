#!/usr/bin/env python3
"""Validate blueprint references/coverage only; never loads or tests the application."""
import collections
import csv
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import unquote

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
errors=[]
checks=[]


def check(condition, label):
    if condition:checks.append(label)
    else:errors.append(label)


def ids(rows):
    return {r['id'] for r in rows}


def main():
    data=json.loads((HERE/'plan-data.json').read_text())
    tasks={t['id']:t for t in data['tasks']}
    tests=ids(data['tests']);questions=ids(data['decisions']);risks=ids(data['risks'])
    for kind in ['tasks','tests','decisions','risks']:
        check(len(ids(data[kind]))==len(data[kind]),kind+' identifiers unique')
    reqs={r['requirement_id'] for r in data['traceability']}
    check(len(reqs)==len(data['traceability']),'Traceability identifiers unique')
    for t in data['tasks']:
        check(set(t['dependencies'])<=set(tasks),t['id']+' dependencies resolve')
        check(t['id'] not in t['dependencies'],t['id']+' no self dependency')
        check(bool(t['owner_role'] and t['deliverable'] and t['acceptance']),t['id']+' has owner output acceptance')
        check(bool(t['test_ids']) and set(t['test_ids'])<=tests,t['id']+' test links resolve')
        check(set(t['decision_ids'])<=questions,t['id']+' decision links resolve')
    seen=set();visiting=set();order=[]
    def visit(key):
        if key in visiting:raise ValueError('Dependency cycle at '+key)
        if key in seen:return
        visiting.add(key)
        for dependency in tasks[key]['dependencies']:
            if dependency in tasks:visit(dependency)
        visiting.remove(key);seen.add(key);order.append(key)
    try:
        for key in tasks:visit(key)
        check(True,'Task dependency graph is acyclic')
    except ValueError as error:check(False,str(error))
    for r in data['traceability']:
        check(bool(r['task_ids']) and set(r['task_ids'])<=set(tasks),r['requirement_id']+' task links resolve')
        check(bool(r['test_ids']) and set(r['test_ids'])<=tests,r['requirement_id']+' validation links resolve')
        check(set(r['decision_ids'])<=questions,r['requirement_id']+' decision links resolve')
        check(bool(r['owner_role'] and r['scope_note'] and r['source_evidence']),r['requirement_id']+' disposition and evidence exist')
    for risk in data['risks']:
        check(set(risk['task_ids'])<=set(tasks) and bool(risk['task_ids']),risk['id']+' mitigation tasks resolve')
        check(set(risk['test_ids'])<=tests and bool(risk['test_ids']),risk['id']+' validation resolves')
        check(set(risk['decision_ids'])<=questions and bool(risk['decision_ids']),risk['id']+' gate decisions resolve')
        check(bool(risk['planned_mitigation'] and risk['residual_risk'] and risk['owner_role']),risk['id']+' mitigation residual owner recorded')
    for q in data['decisions']:
        check(q['resolution_task'] in tasks and bool(q['owner_role'] and q['required_evidence'] and q['blocking_gate']),q['id']+' owner resolution evidence gate exist')
    used_tests={x for t in data['tasks'] for x in t['test_ids']}
    check(tests<=used_tests,'Every designed test has a task owner/path: '+', '.join(sorted(tests-used_tests)))
    check('T-QUAL04' in tasks['T-REL01']['dependencies'],'Current-release security is a dependency of the first real-data pilot')
    check('Q27' in tasks['T-REL01']['decision_ids'],'Initial pilot has an accepted-route/portal scope gate')
    check('manifest' in tasks['T-JOB02']['acceptance'] and 'legacy' in tasks['T-JOB02']['acceptance'],'Every dispatch path enforces the accepted workflow manifest')
    check('privacy' in tasks['T-OPS05']['acceptance'] and 'identities' in tasks['T-OPS05']['acceptance'],'Recovery acceptance includes current access and privacy reconciliation')
    for i in data['tasks']:
        if i['id'].startswith('AUTO-') and 'Disposition' in i['deliverable']:
            check('implementation deferred' in i['status'],i['id']+' later status cannot be mistaken for implementation')
    original=json.loads((ROOT/'docs/automation-opportunities-2026-10-24/opportunities.json').read_text())
    feasibility=json.loads((ROOT/'docs/automation-feasibility-2026-10-25/feasibility.json').read_text())['items']
    check({f"OP-{i['number']:02}" for i in original['items']}<=reqs,'All original 35 opportunities mapped')
    pain=json.loads((ROOT/'docs/pain-points-2026-10-23/pain-points.json').read_text())
    check({i['id'] for g in pain['groups'] for i in g['items']}<=reqs,'All 96 pain points mapped')
    with (ROOT/'docs/OCD_Automation_Requirements_Register.csv').open(newline='',encoding='utf-8-sig') as f:source_reqs=list(csv.DictReader(f))
    check({r['id'] for r in source_reqs}<=reqs,'All 27 requirements register entries mapped')
    for prefix,count in [('C20:TR-',35),('R14:M1-',34),('R21:NEW-',23)]:
        check({f'{prefix}{n:02}' for n in range(1,count+1)}<=reqs,f'All {prefix} source findings mapped')
    check({f'NFR-{n:02}' for n in range(1,36)}<=reqs,'All 35 technical/control requirements mapped')
    check(len([i for i in feasibility if i['selection'] in ['C1','C2']])==20,'Core selection remains 20')
    check(len([i for i in feasibility if i['selection']=='G'])==5,'Gated selection remains five')
    check(len([i for i in feasibility if i['selection']=='L'])==10,'Later/native selection remains ten')
    for i in feasibility:
        t=tasks.get(f"AUTO-{i['number']:02}",{})
        check(t.get('title')==i['title'],f"AUTO-{i['number']:02} original title preserved")
        if i['selection']=='L':
            check('Disposition' in t.get('deliverable',''),f"AUTO-{i['number']:02} explicitly disposition-only")
    l01=next(t for t in data['traceability'] if t['requirement_id']=='L01')
    check('T-PORTAL01' in l01['task_ids'] and 'retained' in l01['scope_note'],'Inherited L01 map requirement retained apart from optional ETA')
    with (HERE/'asvs-applicability.csv').open(newline='') as f:asvs=list(csv.DictReader(f))
    check(len(asvs)==257 and len({r['control_id'] for r in asvs})==257,'ASVS 253 L1/L2 plus four selected L3 IDs enumerated')
    source_manifest=json.loads((HERE/'source-register.json').read_text())
    expected_controls={r['id']:r['level'] for r in source_manifest['asvs']['required_controls']}
    check({r['control_id']:r['level'] for r in asvs}==expected_controls,'ASVS IDs and levels match the pinned official-source index')
    for control in asvs:
        check(set(control['task_ids'].split(';'))<=set(tasks) and set(control['test_family_ids'].split(';'))<=tests,control['control_id']+' task/test family resolves')
        check('Pending' in control['applicability'] and 'Not verified' in control['evidence_status'],control['control_id']+' verification not overstated')
    docs=[ROOT/'docs/OCD_Custom_System_Implementation_Plan.md']+list(HERE.glob('*.md'))
    for doc in docs:
        text=doc.read_text()
        check(text.count('```')%2==0,str(doc.relative_to(ROOT))+' code fences balanced')
        for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',text):
            target=target.strip('<>')
            if '://' in target or target.startswith('#'):continue
            relative=unquote(target.split('#',1)[0])
            check((doc.parent/relative).exists(),str(doc.relative_to(ROOT))+' local link '+target)
    baseline=json.loads((HERE/'source-baseline.json').read_text())
    current_files=subprocess.check_output(['git','ls-files','-co','--exclude-standard','-z'],cwd=ROOT,text=True).split('\0')
    current_application=set()
    prefixes=('backend/','lib/','frontend/','workspace/','scripts/','api/','tests/','.github/','infra/','deploy/')
    root_names={'server.cjs','package.json','package-lock.json','vercel.json','.env.example','Dockerfile','railway.json','railway.toml'}
    for name in current_files:
        if name and (ROOT/name).is_file() and (name.startswith(prefixes) or name in root_names):current_application.add(name)
    check(current_application==set(baseline['application_source_sha256']),'No added or removed application/CI/infrastructure files in checked scope')
    for name,expected in baseline['application_source_sha256'].items():
        p=ROOT/name
        check(p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==expected,'Plan-only boundary preserved: '+name)
    for name,expected in source_manifest['local_sources_sha256'].items():
        check(hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==expected,'Reviewed source unchanged: '+name)
    for name,key in [('roadmap','tasks'),('test-catalog','tests'),('decision-register','decisions'),('risk-register','risks'),('requirements-traceability','traceability')]:
        with (HERE/f'{name}.csv').open(newline='') as stream:csv_rows=list(csv.DictReader(stream))
        expected_rows=[{k:';'.join(v) if isinstance(v,list) else str(v) for k,v in row.items()} for row in data[key]]
        check(csv_rows==expected_rows,name+' CSV matches canonical plan data')
    with (HERE/'critical-review-findings.csv').open(newline='') as stream:review_findings=list(csv.DictReader(stream))
    check(len(review_findings)==10,'Ten separate-review findings recorded')
    for finding in review_findings:
        check(set(finding['future_task_ids'].split(';'))<=set(tasks) and set(finding['validation_ids'].split(';'))<=tests,finding['id']+' revision has valid task/test links')
        check('Addressed' in finding['planning_status'] and 'Not implemented' in finding['implementation_status'],finding['id']+' planning revision not misreported as implementation')
    # Keep the review explicitly separate from implementation and dynamic tests.
    report=HERE/'final-validation-report.md'
    check(report.exists(),'Separate final validation report exists')
    if report.exists():
        review_text=report.read_text()
        check('Unresolved' in review_text and 'not executed' in review_text,'Final report distinguishes unresolved gates and unexecuted system tests')
    result={'date':'2026-10-25','status':'pass' if not errors else 'fail','checks_passed':len(checks),'errors':errors,
      'counts':{key:len(data[key]) for key in ['tasks','tests','decisions','risks','traceability']},
      'asvs_controls':len(asvs),'application_source_files_unchanged':len(baseline['application_source_sha256']),
      'application_tests_executed':False,'live_account_actions':False,'scope':'Planning/documentation structural validation only',
      'topological_task_order':order}
    (HERE/'validation-results.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k!='topological_task_order'},indent=2))
    raise SystemExit(1 if errors else 0)


if __name__=='__main__':main()
