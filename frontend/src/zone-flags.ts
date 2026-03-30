interface WindowWithZone extends Window {
  __Zone_disable_customElements: boolean;
}

((window as unknown) as WindowWithZone).__Zone_disable_customElements = true;
