type ParameterValue = string | number | null;

export class Parameter {
  name;
  value;
  constructor(options: { value: ParameterValue; name: string }) {
    this.value = options.value;
    this.name = options.name;
  }
  getValue() {
    return this.value;
  }
  getName() {
    return this.name;
  }
}
