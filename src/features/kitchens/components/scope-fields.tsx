/** Hidden fields telling an action which surface's session to use and (for admins) which kitchen. */
export function ScopeFields({ surface, kitchenId }: { surface: 'partner' | 'admin'; kitchenId: string }) {
  return (
    <>
      <input type="hidden" name="surface" value={surface} />
      <input type="hidden" name="kitchenId" value={kitchenId} />
    </>
  );
}
