import { trait } from "./traits.js";
import { Model } from "../Model.js";
import { SoftDeletes as SfDeletes } from "./built-ins.js";

@trait("SoftDeletes")
export class SoftDeletes extends SfDeletes {
  /**
   * Determine if the model has been soft-deleted
   */
  trashed(): boolean {
    const model = this as any as Model;
    return !!(model as any).deleted_at;
  }

  /**
   * Determine if the model is not soft-deleted
   */
  isNotTrashed(): boolean {
    return !this.trashed();
  }

  /**
   * Force delete the model (bypass soft delete)
   */
  async forceDelete(): Promise<boolean> {
    const model = this as any as Model;
    return model.delete(true);
  }

  /**
   * Restore a soft-deleted model
   */
  async restore(): Promise<boolean> {
    const model = this as any as Model;
    return (model as any).restore();
  }

  static boot(modelClass: typeof Model): void {
    // Mark the model as supporting soft deletes
    (modelClass as any).softDeletes = true;
  }
}
