package validator

// MessageRecord maps a field to its first failure message.
type MessageRecord map[string]string

type MapValidator struct {
	fvs map[string]*FieldValidator
}

func NewMapValidator() *MapValidator {
	return &MapValidator{fvs: make(map[string]*FieldValidator)}
}

// Validate runs every field's rules; the first failing rule per field wins.
func (v *MapValidator) Validate(dict map[string]interface{}) (MessageRecord, bool) {
	mr := make(MessageRecord)
	for key, fv := range v.fvs {
		if msg := fv.Validate(dict[key]); msg != "" {
			mr[key] = msg
		}
	}
	return mr, len(mr) == 0
}

func (v *MapValidator) Field(key string) *FieldValidator {
	fv := &FieldValidator{key: key}
	v.fvs[key] = fv
	return fv
}

type FieldValidator struct {
	key   string
	rules []rule
}

// Validate returns the first failing rule's message, or "" when all pass.
func (v *FieldValidator) Validate(data interface{}) string {
	for _, rule := range v.rules {
		if msg, ok := rule(v.key, data); !ok {
			return msg
		}
	}
	return ""
}

func (v *FieldValidator) registerRule(rule rule) {
	v.rules = append(v.rules, rule)
}
