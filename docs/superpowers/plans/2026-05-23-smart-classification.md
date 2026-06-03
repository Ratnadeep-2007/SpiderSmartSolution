# Smart Classification Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Smart Classification Workspace that automates rule discovery, provides real-time simulation, and allows retroactive cleanup of records.

**Architecture:** 
- **Backend:** Add discovery and simulation logic to `classification_service.py`. Update `master` router to expose new endpoints and handle retroactive flag in rule creation.
- **Frontend:** Refactor `AdminClassification.tsx` to include a Discovery Bar, a dual-pane Rule Builder with live preview, and a retroactive application toggle.

**Tech Stack:** FastAPI, SQLAlchemy, React, Tailwind CSS, Lucide React.

---

### Task 1: Backend Schemas

**Files:**
- Modify: `backend/app/schemas/master.py`

- [ ] **Step 1: Add Discovery and Simulation schemas**

```python
class ClassificationDiscovery(BaseModel):
    keyword: str
    count: int

class ClassificationSimulationRequest(BaseModel):
    field: str
    operator: str
    value: str

class ClassificationSimulationResponse(BaseModel):
    total_count: int
    sample_records: List[str]

class AutoClassificationRuleCreate(AutoClassificationRuleBase):
    apply_retroactive: bool = False
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/master.py
git commit -m "feat(schema): add classification discovery and simulation schemas"
```

---

### Task 2: Backend Service Implementation (Part 1 - Discovery & Simulation)

**Files:**
- Modify: `backend/app/services/classification_service.py`

- [ ] **Step 1: Implement `discover_patterns` and `simulate_rule`**

```python
import collections
import re

async def discover_patterns(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Finds top 10 keywords in unclassified records.
    """
    result = await db.execute(
        select(InventoryRecord.description)
        .where(InventoryRecord.category_id == None)
        .limit(500)
    )
    descriptions = result.scalars().all()
    
    words = []
    for desc in descriptions:
        if desc:
            # Simple word extraction
            words.extend(re.findall(r'\w{4,}', desc.lower()))
            
    counter = collections.Counter(words)
    common = counter.most_common(10)
    
    return [{"keyword": k, "count": c} for k, c in common]

async def simulate_rule(db: AsyncSession, condition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates a rule and returns impact statistics.
    """
    field = condition.get("field")
    operator = condition.get("operator")
    value = condition.get("value")
    
    # We'll use the same logic as search_service for consistency
    query = select(InventoryRecord).where(InventoryRecord.category_id == None)
    
    if operator == "contains":
        query = query.where(getattr(InventoryRecord, field).ilike(f"%{value}%"))
    elif operator == "equals":
        query = query.where(getattr(InventoryRecord, field).ilike(value))
    elif operator == "starts_with":
        query = query.where(getattr(InventoryRecord, field).ilike(f"{value}%"))
        
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()
    
    sample_result = await db.execute(query.limit(5))
    samples = [r.description for r in sample_result.scalars().all()]
    
    return {
        "total_count": total,
        "sample_records": samples
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/classification_service.py
git commit -m "feat(service): implement discovery and simulation logic"
```

---

### Task 3: Backend Service Implementation (Part 2 - Retroactive Cleanup)

**Files:**
- Modify: `backend/app/services/classification_service.py`

- [ ] **Step 1: Implement `apply_rule_retroactively`**

```python
async def apply_rule_retroactively(db: AsyncSession, rule_id: uuid.UUID):
    """
    Applies a rule to all existing matching records (where category is null).
    """
    result = await db.execute(select(AutoClassificationRule).where(AutoClassificationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        return
        
    field = rule.condition.get("field")
    operator = rule.condition.get("operator")
    value = rule.condition.get("value")
    
    action_type = rule.action.get("type")
    action_value = rule.action.get("value")
    
    # Target only untagged/uncategorized records as per spec
    query = select(InventoryRecord).where(InventoryRecord.category_id == None)
    
    if operator == "contains":
        query = query.where(getattr(InventoryRecord, field).ilike(f"%{value}%"))
    elif operator == "equals":
        query = query.where(getattr(InventoryRecord, field).ilike(value))
    elif operator == "starts_with":
        query = query.where(getattr(InventoryRecord, field).ilike(f"{value}%"))
        
    matching_result = await db.execute(query)
    records = matching_result.scalars().all()
    
    count = 0
    for record in records:
        if action_type == "SET_CATEGORY":
            record.category_id = uuid.UUID(action_value)
            count += 1
        elif action_type == "ADD_TAGS":
            tags = set(record.tags or [])
            new_tags = [t.strip() for t in action_value.split(',') if t.strip()]
            tags.update(new_tags)
            record.tags = list(tags)
            count += 1
            
    await db.commit()
    return count
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/services/classification_service.py
git commit -m "feat(service): implement retroactive rule application"
```

---

### Task 4: Backend Router Updates

**Files:**
- Modify: `backend/app/routers/master.py`

- [ ] **Step 1: Add new endpoints and update `create_classification_rule`**

```python
from ..services import classification_service

@router.get("/classification/discover", response_model=List[schemas.ClassificationDiscovery])
async def discover_classification_patterns(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    return await classification_service.discover_patterns(db)

@router.post("/classification/simulate", response_model=schemas.ClassificationSimulationResponse)
async def simulate_classification_rule(
    sim_in: schemas.ClassificationSimulationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN"]))
):
    return await classification_service.simulate_rule(db, sim_in.model_dump())

@router.post("/classification-rules", response_model=schemas.AutoClassificationRule)
async def create_classification_rule(
    rule_in: schemas.AutoClassificationRuleCreate, # Use new schema
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_role(["SYSTEM_ADMIN", "RECORDS_MANAGER"]))
):
    rule_data = rule_in.model_dump()
    apply_retroactive = rule_data.pop("apply_retroactive", False)
    
    db_rule = AutoClassificationRule(**rule_data)
    db.add(db_rule)
    await db.commit()
    await db.refresh(db_rule)
    
    if apply_retroactive:
        await classification_service.apply_rule_retroactively(db, db_rule.id)
    
    return db_rule
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/routers/master.py
git commit -m "feat(router): add discovery/simulation endpoints and retroactive flag"
```

---

### Task 5: Frontend - Refactor AdminClassification Page

**Files:**
- Modify: `frontend/src/pages/AdminClassification.tsx`

- [ ] **Step 1: Add Discovery Bar and Simulation UI logic**

```tsx
// Inside AdminClassification component
const [discoveries, setDiscoveries] = useState<{keyword: string, count: number}[]>([])
const [simulation, setSimulation] = useState<{total_count: number, sample_records: string[]} | null>(null)
const [applyRetroactive, setApplyRetroactive] = useState(false)

// Fetch discoveries on load
const fetchDiscoveries = async () => {
    try {
        const res = await api.get('/master/classification/discover')
        setDiscoveries(res.data)
    } catch (_err) { console.error("Discovery failed") }
}

// Effect for simulation
useEffect(() => {
    if (activeTab === 'rules' && showModal && ruleVal.length > 2) {
        const timer = setTimeout(async () => {
            try {
                const res = await api.post('/master/classification/simulate', {
                    field: ruleField,
                    operator: ruleOp,
                    value: ruleVal
                })
                setSimulation(res.data)
            } catch (_err) { setSimulation(null) }
        }, 500)
        return () => clearTimeout(timer)
    } else {
        setSimulation(null)
    }
}, [ruleVal, ruleField, ruleOp, activeTab, showModal])
```

- [ ] **Step 2: Update UI with Discovery chips and Simulation preview**

```tsx
// Discovery Bar in render
{discoveries.length > 0 && activeTab === 'rules' && (
    <div className="flex flex-wrap gap-2 mb-4 bg-muted/20 p-4 rounded-xl border border-dashed">
        <span className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-amber-500" /> Suggestions:
        </span>
        {discoveries.map(d => (
            <button 
                key={d.keyword}
                onClick={() => {
                    openModal()
                    setRuleName(`Auto-classify ${d.keyword}`)
                    setRuleValue(d.keyword)
                }}
                className="bg-background border rounded-full px-3 py-1 text-xs hover:border-primary transition-colors flex items-center gap-2"
            >
                {d.keyword} <span className="text-muted-foreground font-mono">({d.count})</span>
            </button>
        ))}
    </div>
)}

// Simulation Preview in Modal
{simulation && (
    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase text-primary">Live Simulation</span>
            <span className="text-xs font-bold">{simulation.total_count} records match</span>
        </div>
        <div className="space-y-1">
            {simulation.sample_records.map((s, i) => (
                <div key={i} className="text-[10px] text-muted-foreground truncate border-l-2 border-primary/20 pl-2">
                    {s}
                </div>
            ))}
        </div>
    </div>
)}

// Retroactive Toggle in Modal
<div className="flex items-center gap-2 py-2">
    <input 
        type="checkbox" id="retro" 
        checked={applyRetroactive} 
        onChange={e => setApplyRetroactive(e.target.checked)}
    />
    <label htmlFor="retro" className="text-xs font-medium cursor-pointer">Apply to all existing matching records</label>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/AdminClassification.tsx
git commit -m "feat(ui): implement discovery bar and simulation preview"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Verify Discovery**
- [ ] **Step 2: Verify Simulation**
- [ ] **Step 3: Verify Retroactive Application**
- [ ] **Step 4: Commit all remaining changes**

```bash
git add .
git commit -m "feat: complete smart classification workspace implementation"
```
