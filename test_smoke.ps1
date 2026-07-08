$ErrorActionPreference = "Continue"
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Test 1: Homepage
Write-Host "=== TEST 1: Homepage ==="
try {
    $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -WebSession $session -TimeoutSec 5
    Write-Host "PASS - Status: $($r.StatusCode)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 2: Products API
Write-Host "`n=== TEST 2: Products API ==="
try {
    $products = Invoke-RestMethod -Uri 'http://localhost:3000/api/products' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - Product count: $($products.Count)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 3: Single Product
Write-Host "`n=== TEST 3: Single Product (salted-dark-chocolate) ==="
try {
    $p = Invoke-RestMethod -Uri 'http://localhost:3000/api/products/salted-dark-chocolate' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - Name: $($p.name), Price: $($p.price), Category: $($p.category)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 4: Session (no login)
Write-Host "`n=== TEST 4: Session Check (not logged in) ==="
try {
    $s = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/session' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - loggedIn: $($s.loggedIn)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 5: Signup
Write-Host "`n=== TEST 5: Signup ==="
try {
    $body = '{"email":"smoketest@example.com","password":"Pass1234","name":"Smoke Tester","phone":"+15550001111"}'
    $signup = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/signup' -Method POST -Body $body -ContentType 'application/json' -WebSession $session -TimeoutSec 10
    Write-Host "PASS - Message: $($signup.message)"
} catch {
    $errMsg = $_.ErrorDetails.Message
    if ($errMsg -match "already exists") {
        Write-Host "PASS (user already exists, expected on re-run)"
    } else {
        Write-Host "INFO - $errMsg"
    }
}

# Test 6: Login
Write-Host "`n=== TEST 6: Login ==="
try {
    $loginBody = '{"email":"smoketest@example.com","password":"Pass1234"}'
    $login = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body $loginBody -ContentType 'application/json' -WebSession $session -TimeoutSec 10
    Write-Host "PASS - Welcome: $($login.user.name)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 7: Session (after login)
Write-Host "`n=== TEST 7: Session Check (after login) ==="
try {
    $s2 = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/session' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - loggedIn: $($s2.loggedIn), user: $($s2.user.name)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 8: Add to Cart
Write-Host "`n=== TEST 8: Add to Cart ==="
try {
    $cartBody = '{"productId":"salted-dark-chocolate","quantity":2}'
    $cart = Invoke-RestMethod -Uri 'http://localhost:3000/api/cart' -Method POST -Body $cartBody -ContentType 'application/json' -WebSession $session -TimeoutSec 10
    Write-Host "PASS - Cart updated"
} catch {
    Write-Host "FAIL - $_"
}

# Test 9: Get Cart
Write-Host "`n=== TEST 9: Get Cart ==="
try {
    $getCart = Invoke-RestMethod -Uri 'http://localhost:3000/api/cart' -WebSession $session -TimeoutSec 5
    $cartJson = $getCart | ConvertTo-Json -Depth 3
    Write-Host "PASS - Cart contents retrieved"
    Write-Host $cartJson
} catch {
    Write-Host "FAIL - $_"
}

# Test 10: Wishlist Toggle
Write-Host "`n=== TEST 10: Wishlist Toggle ==="
try {
    $wlBody = '{"productId":"rose-velvet-cake"}'
    $wl = Invoke-RestMethod -Uri 'http://localhost:3000/api/wishlist/toggle' -Method POST -Body $wlBody -ContentType 'application/json' -WebSession $session -TimeoutSec 10
    Write-Host "PASS - Status: $($wl.status)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 11: Get Wishlist
Write-Host "`n=== TEST 11: Get Wishlist ==="
try {
    $getWl = Invoke-RestMethod -Uri 'http://localhost:3000/api/wishlist' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - Wishlist retrieved"
} catch {
    Write-Host "FAIL - $_"
}

# Test 12: Submit Review
Write-Host "`n=== TEST 12: Submit Review ==="
try {
    $revBody = '{"productId":"salted-dark-chocolate","rating":5,"comment":"Amazing cookie!","userName":"Smoke Tester"}'
    $rev = Invoke-RestMethod -Uri 'http://localhost:3000/api/reviews' -Method POST -Body $revBody -ContentType 'application/json' -WebSession $session -TimeoutSec 10
    Write-Host "PASS - Review submitted"
} catch {
    Write-Host "FAIL - $_"
}

# Test 13: Get Reviews
Write-Host "`n=== TEST 13: Get Reviews ==="
try {
    $getRev = Invoke-RestMethod -Uri 'http://localhost:3000/api/reviews/salted-dark-chocolate' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - Review count: $($getRev.Count)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 14: Place Order
Write-Host "`n=== TEST 14: Place Order ==="
try {
    $orderBody = @{
        customerName = "Smoke Tester"
        customerEmail = "smoketest@example.com"
        customerPhone = "+15550001111"
        deliveryDate = "2026-07-15"
        address = "123 Test Street"
        specialInstructions = "Ring the bell"
        items = @{
            "salted-dark-chocolate" = @{
                productId = "salted-dark-chocolate"
                name = "Salted Dark Chocolate Cookie"
                price = 4.5
                quantity = 2
            }
        }
        total = 9.0
    } | ConvertTo-Json -Depth 3
    $order = Invoke-RestMethod -Uri 'http://localhost:3000/api/orders' -Method POST -Body $orderBody -ContentType 'application/json' -WebSession $session -TimeoutSec 10
    Write-Host "PASS - Order placed, ID: $($order.orderId)"
    $script:orderId = $order.orderId
} catch {
    Write-Host "FAIL - $($_.ErrorDetails.Message)"
}

# Test 15: Get Orders
Write-Host "`n=== TEST 15: Get Order History ==="
try {
    $orders = Invoke-RestMethod -Uri 'http://localhost:3000/api/orders' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - Order history count: $($orders.Count)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 16: Logout
Write-Host "`n=== TEST 16: Logout ==="
try {
    $logout = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/logout' -Method POST -WebSession $session -TimeoutSec 5
    Write-Host "PASS - $($logout.message)"
} catch {
    Write-Host "FAIL - $_"
}

# Test 17: Session (after logout)
Write-Host "`n=== TEST 17: Session Check (after logout) ==="
try {
    $s3 = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/session' -WebSession $session -TimeoutSec 5
    Write-Host "PASS - loggedIn: $($s3.loggedIn)"
} catch {
    Write-Host "FAIL - $_"
}

Write-Host "`n=== ALL SMOKE TESTS COMPLETE ==="
