import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect } from '@angular/core';

import { RoleService } from '../../core/services/role.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  private templateRef: TemplateRef<unknown> = inject(TemplateRef<unknown>);
  private viewContainer: ViewContainerRef = inject(ViewContainerRef);
  private roleSvc: RoleService = inject(RoleService);

  private hasView: boolean = false;
  private roles: string | string[] = [];

  constructor() {
    effect(() => {
      this.updateView();
    });
  }

  @Input() public set appHasRole(val: string | string[]) {
    this.roles = val;
    this.updateView();
  }

  private updateView(): void {
    const hasAccess: boolean = this.roleSvc.hasAnyRole(this.roles);

    if (hasAccess && !this.hasView) {
      this.viewContainer.createEmbeddedView(this.templateRef);
      this.hasView = true;
    } else if (!hasAccess && this.hasView) {
      this.viewContainer.clear();
      this.hasView = false;
    }
  }
}
