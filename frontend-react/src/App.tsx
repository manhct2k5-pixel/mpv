import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import StoreLayout from './components/layout/StoreLayout.tsx';
import SellerLayout from './components/layout/SellerLayout.tsx';
import AdminLayout from './components/layout/AdminLayout.tsx';
import StaffLayout from './components/layout/StaffLayout.tsx';
import ProtectedRoute from './components/layout/ProtectedRoute.tsx';
import SellerRoute from './components/layout/SellerRoute.tsx';
import StaffRoute from './components/layout/StaffRoute.tsx';
import AdminRoute from './components/layout/AdminRoute.tsx';
import CustomerRoute from './components/layout/CustomerRoute.tsx';

const StorefrontPage = lazy(() => import('./pages/StorefrontPage.tsx'));
const StoreCategoryPage = lazy(() => import('./pages/StoreCategoryPage.tsx'));
const LookbookPage = lazy(() => import('./pages/LookbookPage.tsx'));
const LookbookDetailPage = lazy(() => import('./pages/LookbookDetailPage.tsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.tsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.tsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.tsx'));
const SellerRegisterPage = lazy(() => import('./pages/SellerRegisterPage.tsx'));
const AccountPage = lazy(() => import('./pages/AccountPage.tsx'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage.tsx'));
const CartPage = lazy(() => import('./pages/CartPage.tsx'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage.tsx'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage.tsx'));
const OrdersPage = lazy(() => import('./pages/OrdersPage.tsx'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage.tsx'));
const WishlistPage = lazy(() => import('./pages/WishlistPage.tsx'));
const CustomerSupportRequestsPage = lazy(() => import('./pages/CustomerSupportRequestsPage.tsx'));
const AddressBookPage = lazy(() => import('./pages/AddressBookPage.tsx'));
const ProductManagementPage = lazy(() => import('./pages/ProductManagementPage.tsx'));
const SellerProfilePage = lazy(() => import('./pages/SellerProfilePage.tsx'));
const StyleMessagesPage = lazy(() => import('./pages/StyleMessagesPage.tsx'));
const StyleOrderCreatePage = lazy(() => import('./pages/StyleOrderCreatePage.tsx'));
const SellerRatingsPage = lazy(() => import('./pages/SellerRatingsPage.tsx'));
const SellerReportsPage = lazy(() => import('./pages/SellerReportsPage.tsx'));
const SellerOperationsPage = lazy(() => import('./pages/SellerOperationsPage.tsx'));
const SellerOrdersPage = lazy(() => import('./pages/SellerOrdersPage.tsx'));
const SellerWorkspacePage = lazy(() => import('./pages/SellerWorkspacePage.tsx'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage.tsx'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage.tsx'));
const AdminStaffPage = lazy(() => import('./pages/AdminStaffPage.tsx'));
const AdminPermissionsPage = lazy(() => import('./pages/AdminPermissionsPage.tsx'));
const AdminCatalogConfigPage = lazy(() => import('./pages/AdminCatalogConfigPage.tsx'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage.tsx'));
const AdminReportsPage = lazy(() => import('./pages/AdminReportsPage.tsx'));
const AdminRefundsPage = lazy(() => import('./pages/AdminRefundsPage.tsx'));
const AdminLogsPage = lazy(() => import('./pages/AdminLogsPage.tsx'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage.tsx'));
const StaffDashboardPage = lazy(() => import('./pages/StaffDashboardPage.tsx'));
const StaffOrderProcessingPage = lazy(() => import('./pages/StaffOrderProcessingPage.tsx'));
const StaffQCPackingPage = lazy(() => import('./pages/StaffQCPackingPage.tsx'));
const StaffShipmentPage = lazy(() => import('./pages/StaffShipmentPage.tsx'));
const StaffTicketsPage = lazy(() => import('./pages/StaffTicketsPage.tsx'));
const StaffReturnsPage = lazy(() => import('./pages/StaffReturnsPage.tsx'));
const StaffStatusTimelinePage = lazy(() => import('./pages/StaffStatusTimelinePage.tsx'));
const StaffProfilePage = lazy(() => import('./pages/StaffProfilePage.tsx'));

const RouteFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
    Đang tải trang...
  </div>
);

const App = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/seller/register" element={<SellerRegisterPage />} />
        <Route path="/dang-ky-nguoi-ban" element={<SellerRegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/budgets"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/investments"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tools"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Navigate to="/tai-khoan" replace />
            </ProtectedRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <SellerRoute>
                <SellerLayout />
              </SellerRoute>
            </ProtectedRoute>
          }
        >
          <Route path="/seller" element={<SellerWorkspacePage />} />
          <Route path="/seller/san-pham" element={<ProductManagementPage />} />
          <Route path="/seller/don-hang" element={<SellerOrdersPage />} />
          <Route path="/seller/bao-cao" element={<SellerReportsPage />} />
          <Route path="/seller/ho-so" element={<SellerProfilePage />} />
          <Route path="/seller/danh-gia" element={<SellerRatingsPage />} />
          <Route path="/seller/van-hanh" element={<SellerOperationsPage />} />
          <Route
            path="/seller/tao-don"
            element={
              <StaffRoute>
                <StyleOrderCreatePage />
              </StaffRoute>
            }
          />
          <Route path="/seller/style-order" element={<Navigate to="/seller/tao-don" replace />} />
          <Route
            path="/seller/control-center"
            element={
              <AdminRoute>
                <Navigate to="/admin" replace />
              </AdminRoute>
            }
          />
          <Route
            path="/seller/tickets"
            element={<StyleMessagesPage />}
          />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/staff" element={<AdminStaffPage />} />
          <Route path="/admin/permissions" element={<AdminPermissionsPage />} />
          <Route path="/admin/catalog-config" element={<AdminCatalogConfigPage />} />
          <Route path="/admin/system" element={<Navigate to="/admin/catalog-config" replace />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/refunds" element={<AdminRefundsPage />} />
          <Route path="/admin/logs" element={<AdminLogsPage />} />
          <Route path="/admin/account" element={<AdminSettingsPage />} />
        </Route>

        <Route
          element={
            <ProtectedRoute>
              <StaffRoute>
                <StaffLayout />
              </StaffRoute>
            </ProtectedRoute>
          }
        >
          <Route path="/staff" element={<StaffDashboardPage />} />
          <Route path="/staff/orders" element={<StaffOrderProcessingPage />} />
          <Route path="/staff/qc-packing" element={<StaffQCPackingPage />} />
          <Route path="/staff/shipments" element={<StaffShipmentPage />} />
          <Route path="/staff/tickets" element={<StaffTicketsPage />} />
          <Route path="/staff/returns" element={<StaffReturnsPage />} />
          <Route path="/staff/status" element={<StaffStatusTimelinePage />} />
          <Route path="/staff/profile" element={<StaffProfilePage />} />
        </Route>

        <Route element={<StoreLayout />}>
          <Route path="/" element={<StorefrontPage />} />
          <Route path="/nu" element={<StoreCategoryPage slug="nu" />} />
          <Route path="/nam" element={<StoreCategoryPage slug="nam" />} />
          <Route path="/phu-kien" element={<StoreCategoryPage slug="phu-kien" />} />
          <Route path="/sale" element={<StoreCategoryPage slug="sale" />} />
          <Route path="/san-pham/:slug" element={<ProductDetailPage />} />
          <Route
            path="/gio-hang"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/thanh-toan"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dat-hang-thanh-cong"
            element={
              <ProtectedRoute>
                <CustomerRoute>
                  <OrderSuccessPage />
                </CustomerRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/don-hang"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/don-hang/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/yeu-thich"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ho-tro"
            element={
              <ProtectedRoute>
                <CustomerRoute>
                  <StyleMessagesPage />
                </CustomerRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ho-tro/yeu-cau"
            element={
              <ProtectedRoute>
                <CustomerRoute>
                  <CustomerSupportRequestsPage />
                </CustomerRoute>
              </ProtectedRoute>
            }
          />
          <Route path="/lookbook" element={<LookbookPage />} />
          <Route path="/lookbook/:id" element={<LookbookDetailPage />} />
          <Route path="/gioi-thieu" element={<AboutPage />} />
          <Route
            path="/tai-khoan"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tai-khoan/dia-chi"
            element={
              <ProtectedRoute>
                <CustomerRoute>
                  <AddressBookPage />
                </CustomerRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<StorefrontPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
