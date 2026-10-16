package validator

import "testing"

func TestRules(t *testing.T) {
	cases := []struct {
		name  string
		build func(fv *FieldValidator)
		data  interface{}
		pass  bool
	}{
		{"required absent fails", func(fv *FieldValidator) { fv.Required() }, nil, false},
		{"required empty string fails", func(fv *FieldValidator) { fv.Required() }, "", false},
		{"required value passes", func(fv *FieldValidator) { fv.Required() }, "x", true},
		{"required zero passes", func(fv *FieldValidator) { fv.Required() }, float64(0), true},
		{"string absent passes", func(fv *FieldValidator) { fv.String() }, nil, true},
		{"string rejects number", func(fv *FieldValidator) { fv.String() }, float64(1), false},
		{"maxlen long fails", func(fv *FieldValidator) { fv.MaxLen(3) }, "abcd", false},
		{"maxlen exact passes", func(fv *FieldValidator) { fv.MaxLen(3) }, "abc", true},
		{"maxlen absent passes", func(fv *FieldValidator) { fv.MaxLen(3) }, nil, true},
		{"regex ok", func(fv *FieldValidator) { fv.Regex(`^\d+$`) }, "42", true},
		{"regex bad", func(fv *FieldValidator) { fv.Regex(`^\d+$`) }, "x", false},
		{"int ok", func(fv *FieldValidator) { fv.Int(1, 10) }, float64(3), true},
		{"int absent passes", func(fv *FieldValidator) { fv.Int(1, 10) }, nil, true},
		{"int fraction fails", func(fv *FieldValidator) { fv.Int(1, 10) }, 1.5, false},
		{"int out of range fails", func(fv *FieldValidator) { fv.Int(1, 10) }, float64(11), false},
		{"int rejects string", func(fv *FieldValidator) { fv.Int(1, 10) }, "3", false},
		{"bool ok", func(fv *FieldValidator) { fv.Bool() }, true, true},
		{"bool rejects string", func(fv *FieldValidator) { fv.Bool() }, "true", false},
		{"uuid ok", func(fv *FieldValidator) { fv.UUID() }, "01a1247c-269d-7096-b1e2-649ed0395555", true},
		{"uuid bad", func(fv *FieldValidator) { fv.UUID() }, "nope", false},
		{"base64 ok", func(fv *FieldValidator) { fv.Base64(3) }, "YWJj", true},
		{"base64 absent passes", func(fv *FieldValidator) { fv.Base64(3) }, nil, true},
		{"base64 too long fails", func(fv *FieldValidator) { fv.Base64(2) }, "YWJj", false},
		{"base64 malformed fails", func(fv *FieldValidator) { fv.Base64(3) }, "***", false},
	}

	for _, tc := range cases {
		v := NewMapValidator()
		tc.build(v.Field("f"))
		mr, pass := v.Validate(map[string]interface{}{"f": tc.data})
		if pass != tc.pass {
			t.Errorf("%s: pass=%v, want %v (mr=%v)", tc.name, pass, tc.pass, mr)
		}
		if pass && len(mr) != 0 {
			t.Errorf("%s: passing validation returned messages %v", tc.name, mr)
		}
		if !pass && len(mr["f"]) == 0 {
			t.Errorf("%s: failing validation returned no message for f", tc.name)
		}
	}
}

func TestValidate_CollectsPerFieldMessages(t *testing.T) {
	v := NewMapValidator()
	v.Field("name").Required()
	v.Field("role").Required().Regex(`^(admin|member)$`)

	mr, pass := v.Validate(map[string]interface{}{"role": "bogus"})
	if pass {
		t.Fatal("expected validation to fail")
	}
	if len(mr["name"]) != 1 || mr["name"][0] != "name is required" {
		t.Fatalf("expected name required message, got %v", mr["name"])
	}
	if len(mr["role"]) != 1 {
		t.Fatalf("expected one role message, got %v", mr["role"])
	}
}

func TestFieldValidator_StopsAtFirstFailure(t *testing.T) {
	v := NewMapValidator()
	v.Field("role").Required().Regex(`^admin$`)

	mr, pass := v.Validate(map[string]interface{}{})
	if pass || len(mr["role"]) != 1 || mr["role"][0] != "role is required" {
		t.Fatalf("expected only the required message, got %v", mr)
	}
}
