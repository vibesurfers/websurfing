# Architecture Evolution Plan - CODEBASE_SUMMARY.MD Updates

## Executive Summary

This plan identifies required updates to the existing CODEBASE_SUMMARY.MD to support the enhanced "Intelligent Research Engine" vision, focusing on:
- Template-driven property suggestions
- Multi-operator adaptive search
- Quality evaluation and improvement cycles
- Items table with pointer architecture
- Enhanced Gemini tool integration (Maps, Function Calling)

---

## Section-by-Section Analysis

### ✅ Section 1: FRONTEND USER INPUT FLOW
**Status**: Minor Updates Required
**Changes Needed**:
- Add template selection flow in welcome process
- Property suggestion UI during sheet creation
- Enhanced column configuration with operator assignments

**New Components Required**:
- `TemplateSelector` component
- `PropertySuggestionEngine` service
- Template-aware column creation UI

---

### 🔄 Section 2: CELL UPDATE MUTATION & EVENT CREATION
**Status**: Moderate Updates Required
**Changes Needed**:
- Update `updateCell` mutation to support items table architecture
- Add `cellItemId` field to cells table
- Support for different data types (location, url, structured data)
- Enhanced event payload with template context

**Database Changes**:
```sql
-- Add to cells table
ALTER TABLE cells ADD COLUMN item_id uuid REFERENCES discovered_items(id);

-- New discovered_items table (detailed in Section 11)
```

---

### ✅ Section 3: BACKGROUND EVENT PROCESSOR
**Status**: Minor Updates Required
**Changes Needed**:
- Enhanced event grouping by template type
- Support for multi-step evaluation cycles
- Integration with transformer sessions for user clarification

**Code Updates**:
- `background-processor.ts`: Add template-aware processing
- Enhanced retry logic for quality improvement cycles

---

### 🚨 Section 4: SHEET CONTEXT BUILDING
**Status**: Major Updates Required
**Changes Needed**:
- **CRITICAL**: Integration with templates system
- Template column configuration loading
- Property-specific operator assignments
- Enhanced context with template goals and validation rules

**New SheetContext Interface**:
```typescript
interface EnhancedSheetContext {
  sheetId: string;
  templateId?: string;
  templateType: 'lucky' | 'marketing' | 'scientific' | 'custom';
  systemPrompt: string;
  templateColumns: TemplateColumn[]; // NEW
  columns: Column[];
  rowIndex: number;
  currentColumnIndex: number;
  rowData: Record<number, string | DiscoveredItem>; // CHANGED
  qualityThreshold: number; // NEW
}
```

**Files Requiring Updates**:
- `sheet-updater.ts:51-109` - Complete rebuild of context building
- New service: `template-context-builder.ts`

---

### 🚨 Section 5: OPERATOR SELECTION LOGIC
**Status**: Complete Overhaul Required
**Changes Needed**:
- **REPLACE** hardcoded selection logic with template-driven approach
- Support multiple operators per property
- Adaptive fallback strategies
- Integration of Maps and enhanced Function Calling operators

**New Selection Architecture**:
```typescript
class TemplateAwareOperatorSelector {
  selectOperators(
    templateColumn: TemplateColumn,
    currentAttempt: number,
    previousResults: DiscoveredItem[]
  ): {
    primary: OperatorName;
    fallbacks: OperatorName[];
    parallel: OperatorName[];
  }
}
```

**Files Requiring Updates**:
- `operator-controller.ts:194-244` - Complete rewrite of selectOperator method
- New operators: Maps, Evaluator, Enhanced Function Calling

---

### 🔄 Section 6: CONTEXT-AWARE INPUT PREPARATION
**Status**: Moderate Updates Required
**Changes Needed**:
- Add Maps operator input preparation
- Enhanced function calling with template-specific functions
- Multi-operator coordination for parallel execution
- Template prompt integration

**New Input Preparation Methods**:
```typescript
prepareMapInput(event: BaseEvent, templateColumn: TemplateColumn): MapsInput
prepareEvaluatorInput(candidates: DiscoveredItem[]): EvaluatorInput
prepareParallelInputs(operators: OperatorName[]): ParallelInput
```

---

### 🚨 Section 7: GEMINI OPERATOR EXECUTION
**Status**: Major Expansion Required
**Changes Needed**:
- **ADD** Maps operator implementation
- **ADD** Evaluator operator for quality comparison
- Enhanced Function Calling operator with template integration
- Parallel execution coordination
- Quality scoring for all operators

**New Operators Required**:
1. **MapsOperator** - Location/business data with structured output
2. **EvaluatorOperator** - Compare data quality and suggest improvements
3. **ParallelCoordinatorOperator** - Execute multiple operators simultaneously
4. **EnhancedFunctionCallingOperator** - Template-aware custom functions

**Files to Create**:
- `maps-operator.ts`
- `evaluator-operator.ts`
- `parallel-coordinator-operator.ts`
- `enhanced-function-calling-operator.ts`

---

### 🚨 Section 8: RESULT WRITING TO NEXT COLUMN
**Status**: Complete Architecture Change Required
**Changes Needed**:
- **REPLACE** direct cell content writing with items table + pointers
- Quality scoring and storage
- Multi-result comparison and selection
- Confidence tracking and improvement cycles

**New Architecture**:
```typescript
class ItemBasedResultWriter {
  async writeDiscoveredItem(
    item: DiscoveredItem,
    context: SheetContext,
    columnConfig: TemplateColumn
  ): Promise<void> {
    // 1. Store in discovered_items table
    // 2. Evaluate quality vs existing items
    // 3. Update cell with pointer to best item
    // 4. Trigger improvement cycle if below threshold
  }
}
```

**Database Changes**:
```sql
CREATE TABLE discovered_items (
  id uuid PRIMARY KEY,
  property_name varchar(255),
  raw_data jsonb,
  processed_data jsonb,
  confidence_score float,
  quality_metrics jsonb,
  source_operator varchar(50),
  source_metadata jsonb,
  validation_status varchar(20),
  improvement_suggestions text[],
  created_at timestamp
);
```

---

### 🔄 Section 9: EVENT COMPLETION & MARKING
**Status**: Moderate Updates Required
**Changes Needed**:
- Quality threshold checking before completion
- Adaptive retry logic for improvement cycles
- Integration with transformer sessions for clarification
- Multi-operator completion coordination

**New Event States**:
- `awaiting_evaluation` - Item found, needs quality assessment
- `awaiting_improvement` - Below threshold, trying alternative approaches
- `awaiting_clarification` - Needs user input to proceed

---

### 🔄 Section 10: UI CELL UPDATE MECHANISM
**Status**: Moderate Updates Required
**Changes Needed**:
- Display pointer-based data with metadata
- Quality indicators and confidence scores
- Template-aware cell rendering
- Real-time improvement cycle feedback

**UI Enhancements**:
- Quality score badges on cells
- "Improving..." status indicators
- Expandable metadata views
- Template property descriptions

---

### 🚨 Section 11: DATABASE SCHEMA & RELATIONSHIPS
**Status**: Major Updates Required (Already Completed in Schema)
**Changes Needed**:
- ✅ **DONE**: Templates and templateColumns tables added
- ✅ **DONE**: Enhanced sheets table with templateId
- ✅ **DONE**: Transformer sessions and clarification prompts
- 🚨 **TODO**: Add discovered_items table
- 🚨 **TODO**: Add items pointers to cells table

**Missing Schema Elements**:
```sql
-- Still needed
CREATE TABLE discovered_items (
  -- As defined in Section 8
);

-- Update cells table
ALTER TABLE cells ADD COLUMN item_id uuid REFERENCES discovered_items(id);
ALTER TABLE cells ADD COLUMN display_value text; -- Cached display value
ALTER TABLE cells ADD COLUMN confidence_score float;
```

---

### 🚨 Section 12: COMPLETE FLOW TIMELINE
**Status**: Complete Rewrite Required
**Changes Needed**:
- **NEW**: Template selection and property suggestion phase
- **NEW**: Multi-operator execution per property
- **NEW**: Quality evaluation and improvement cycles
- **NEW**: User clarification integration
- **UPDATED**: Timeline to reflect items-based architecture

**New Timeline**:
```
T+0ms: Template Selection & Property Suggestions
T+500ms: Column Configuration with Operator Assignments
T+1000ms: User Input Triggers Multi-Operator Search
T+1500ms: Parallel Execution (Search + Maps + URL Context)
T+3000ms: Quality Evaluation of Discovered Items
T+3500ms: Improvement Cycle (if below threshold)
T+5000ms: Final Selection and Cell Update
T+5500ms: UI Update with Quality Indicators
```

---

## Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
1. **Database Schema Updates** (Section 11)
   - Add discovered_items table
   - Update cells table with pointers
   - Migration scripts

2. **Enhanced SheetContext** (Section 4)
   - Template integration
   - New context building service

### Phase 2: Core Logic (Weeks 3-4)
3. **Template-Aware Operator Selection** (Section 5)
   - Rewrite operator controller
   - Add new operator types

4. **Items-Based Result Storage** (Section 8)
   - New result writing architecture
   - Quality scoring system

### Phase 3: Enhanced Operators (Weeks 5-6)
5. **New Gemini Operators** (Section 7)
   - Maps operator
   - Evaluator operator
   - Enhanced function calling

6. **Adaptive Processing Logic** (Sections 3, 9)
   - Quality-driven retry cycles
   - Transformer sessions integration

### Phase 4: UI & Experience (Weeks 7-8)
7. **Template Selection UI** (Section 1)
   - Welcome flow updates
   - Property suggestion interface

8. **Enhanced Cell Display** (Section 10)
   - Quality indicators
   - Metadata views
   - Real-time status updates

---

## Risk Assessment

### High Risk Areas:
- **Data Migration**: Moving from direct content to pointer-based system
- **Performance**: Multiple operators per property could be slow
- **User Experience**: Complexity of quality evaluation might confuse users

### Mitigation Strategies:
- **Gradual Migration**: Support both old and new systems during transition
- **Intelligent Caching**: Pre-compute common property suggestions
- **Progressive Enhancement**: Start with simple templates, add complexity gradually

---

## Success Metrics

### Technical Metrics:
- Average data quality score improvement: >30%
- Response time per property: <5 seconds
- User clarification requests: <10% of operations

### User Experience Metrics:
- Template adoption rate: >80% of new sheets
- User satisfaction with data accuracy: >4.5/5
- Time to complete research task: <50% of manual research

---

## Next Steps

1. **Immediate**: Create detailed technical specifications for Phase 1
2. **Week 1**: Begin database schema updates and migration planning
3. **Week 2**: Start enhanced SheetContext implementation
4. **Ongoing**: Update CODEBASE_SUMMARY.MD sections as implementation progresses