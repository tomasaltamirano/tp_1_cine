import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Rol } from '../../core/models/perfil.model';

/**
 * Directiva estructural: muestra el contenido solo si el rol actual está en la lista.
 * Uso: <a *appSoloRol="['admin']" routerLink="/admin">Admin</a>
 * (es solo cosmética: la seguridad real está en los guards y en RLS)
 */
@Directive({ selector: '[appSoloRol]', standalone: true })
export class SoloRolDirective {
  private readonly plantilla = inject(TemplateRef<unknown>);
  private readonly contenedor = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);

  readonly appSoloRol = input.required<Rol[]>();
  private visible = false;

  constructor() {
    effect(() => {
      const permitido = this.appSoloRol().includes(this.auth.rol());
      if (permitido && !this.visible) {
        this.contenedor.createEmbeddedView(this.plantilla);
        this.visible = true;
      } else if (!permitido && this.visible) {
        this.contenedor.clear();
        this.visible = false;
      }
    });
  }
}
