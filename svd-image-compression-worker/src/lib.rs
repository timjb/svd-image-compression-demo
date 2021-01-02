mod utils;

use js_sys::Float64Array;
use nalgebra::base::*;
use nalgebra::linalg::SVD;
use rand::distributions::Uniform;
use rand::rngs::SmallRng;
use rand::SeedableRng;
use std::vec::Vec;
use wasm_bindgen::prelude::*;
use web_sys::console;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct SvdResult {
    u: Vec<f64>,
    singular_values: Vec<f64>,
    v_t: Vec<f64>,
}

#[wasm_bindgen]
impl SvdResult {
    fn new(u: DMatrix<f64>, singular_values: DVector<f64>, v_t: DMatrix<f64>) -> SvdResult {
        SvdResult {
            u: u.data.into(),
            singular_values: singular_values.data.into(),
            v_t: v_t.data.into(),
        }
    }
    pub fn u(&self) -> Float64Array {
        unsafe {
            return Float64Array::view(&self.u);
        }
    }
    pub fn singular_values(&self) -> Float64Array {
        unsafe {
            return Float64Array::view(&self.singular_values);
        }
    }
    pub fn v_t(&self) -> Float64Array {
        unsafe {
            return Float64Array::view(&self.v_t);
        }
    }
}

fn permute_columns<T>(mat: &mut DMatrix<f64>, inv_perm: &Vec<(T, usize)>) {
    assert!(mat.ncols() == inv_perm.len());
    let n = mat.ncols();
    let mut already_permuted = vec![false; n];
    for i in 0..n {
        if !already_permuted[i] {
            let (mut j, mut k) = (i, inv_perm[i].1);
            while k != i {
                mat.swap_columns(j, k);
                already_permuted[k] = true;
                j = k;
                k = inv_perm[k].1;
            }
            already_permuted[i] = true;
        }
    }
}

fn permute_rows<T>(mat: &mut DMatrix<f64>, inv_perm: &Vec<(T, usize)>) {
    assert!(mat.nrows() == inv_perm.len());
    let n = mat.nrows();
    let mut already_permuted = vec![false; n];
    for i in 0..n {
        if !already_permuted[i] {
            let (mut j, mut k) = (i, inv_perm[i].1);
            while k != i {
                mat.swap_rows(j, k);
                already_permuted[k] = true;
                j = k;
                k = inv_perm[k].1;
            }
            already_permuted[i] = true;
        }
    }
}

// We have to sort SVD because this is not done by default,
// see https://github.com/dimforge/nalgebra/issues/349
fn sort_svd(svd: &mut SVD<f64, Dynamic, Dynamic>) {
    let mut s: Vec<(_, _)> = svd
        .singular_values
        .into_iter()
        .enumerate()
        .map(|(idx, &v)| (v, idx))
        .collect();
    s.sort_unstable_by(|a, b| b.partial_cmp(a).unwrap());
    match svd.u.iter_mut().next() {
        Some(u) => permute_columns(u, &s),
        None => {}
    }
    match svd.v_t.iter_mut().next() {
        Some(v_t) => permute_rows(v_t, &s),
        None => {}
    }
    svd.singular_values = DVector::from_vec(s.into_iter().map(|(v, _idx)| v).collect());
}

fn sorted_svd(mat: DMatrix<f64>) -> SVD<f64, Dynamic, Dynamic> {
    let mut svd = mat.svd(true, true);
    sort_svd(&mut svd);
    return svd;
}

#[wasm_bindgen]
pub fn svd(a_data: &[f64], nrows: usize, ncols: usize) -> SvdResult {
    let a = DMatrix::from_column_slice(nrows, ncols, a_data);
    console::time_with_label("computation of SVD");
    let svd = sorted_svd(a);
    console::time_end_with_label("computation of SVD");
    return SvdResult::new(svd.u.unwrap(), svd.singular_values, svd.v_t.unwrap());
}

// Randomized algorithm that calculates the truncated SVD
// technique based on https://research.fb.com/fast-randomized-svd/
// Precondition: t <= MIN(nrows, ncols)
#[wasm_bindgen]
pub fn svd_simple_approx(a_data: &[f64], nrows: usize, ncols: usize, t: usize) -> SvdResult {
    let a = DMatrix::from_column_slice(nrows, ncols, a_data);

    console::time_with_label("computation of approximate SVD");

    // Generate matrix Ω ∈ ℝ^{m × n}
    let mut rng = SmallRng::seed_from_u64(2342);
    let distr = Uniform::new(-1.0, 1.0);
    let omega: DMatrix<f64> = DMatrix::from_distribution(ncols, t, &distr, &mut rng);

    // Compute Y = A Ω
    let y = (&a) * omega;

    // Compute the QR decomposition of Y, Y = Q R
    let q = y.qr().q();

    // Compute B = Qᵀ A
    let b = q.tr_mul(&a);

    // Compute the SVD of B
    let b_svd = sorted_svd(b);

    let u = q * b_svd.u.unwrap();

    console::time_end_with_label("computation of approximate SVD");

    return SvdResult::new(u, b_svd.singular_values, b_svd.v_t.unwrap());
}
